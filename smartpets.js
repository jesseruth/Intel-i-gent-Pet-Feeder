var logFoodStatus = false;
var logBeaconRange = true;
var logDoorState = true;
var logPetApproaches = true;
var logStatsPosts = false;
var logFoodSensor = false;
var fakeFoodSensor = true; // Makes food always read as full

var Servo_pin = 5; //Initialize PWM on Digital Pin #5 (D5) and enable the pwm pin
var PWM_period_us = 20000;
var Min_Duty_Cycle = 0.029;
var Max_Duty_Cycle = 0.087;

var mraa = require("mraa"); //require mraa
var request = require('request');
var Bleacon = require('bleacon');
console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the Intel XDK console

var foodSensor = new mraa.Aio(1);
var pwm = new mraa.Pwm(Servo_pin);
pwm.enable(false);
pwm.period_us(PWM_period_us);
pwm.enable(true);

//var url = 'http://192.241.227.79/api/pets/';
//var feed_status_url = 'http://192.241.227.79/api/status/';
var url = 'http://10.65.22.165/api/pets/';
var feed_status_url = 'http://10.65.22.165/api/status/';
var headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic YXBpOiUzTFFpSlJLQTImWm0lT0MqMHdJ'
};

var form = {
    dimension: 'food',
    measure: 'true',
    notes: 'We will win!'
};

Bleacon.startScanning();

var door = false; // Is the door open?
var food = true; // Does food remain?

var pets = {
    'Lola': {
        feedable: true,
        near: false,
        name: 'Lola'
    },
    'Bax': {
        feedable: true,
        near: false,
        name: 'Bax'
    }
}; // Should pet(s) be fed?

var petList = [pets.Lola, pets.Bax];
console.log(petList);

var collars = {
    'dd4749cf29b94630abce2476db66de4e': 'Lola',
    '00000000000000000000000000000001': 'Bax'
};

var petsToFeed = []; // List of pets both near feeder and on feeding schedule

// Important note: this function both updates the record of
// which pets are near, and returns true if ANY pet is currently near and should be fed.
function shouldOpenDoor(uuid, distance) {
    if (distance < 0.3) { // try to feed only registered pets..
        if (!collars[uuid]) {
            if (logPetApproaches)
                console.log('An unknown pet approached [' + uuid + '].');
        } else {
            pets[collars[uuid]].near = true;
        }
    } else {
        if (collars[uuid])
            pets[collars[uuid]].near = false;
    }
    petsToFeed = [];
    for (var i = 0; i < petList.length; ++i) {
        if (petList[i].near && petList[i].feedable) {
            petsToFeed.push(petList[i].name);
        }
    }
    if (logPetApproaches)
        console.log('----PETS TO FEED: ' + petsToFeed);
    if (false) {
        console.log(petList);
    }
    return petsToFeed.length > 0;
}

Bleacon.on('discover', function(bleacon) {
    console.log('discovered a beacon', beacon)
    if (logBeaconRange)
        console.log(Math.floor(bleacon.accuracy * 1e5) / 1e5 + " " /*+ bleacon.proximity + " "*/ + bleacon.uuid + " " + bleacon.major + " " + bleacon.minor);
    var uuid = bleacon.uuid;
    var shouldOpen = shouldOpenDoor(uuid, bleacon.accuracy);
    if (shouldOpen && !door) {
        var name = collars[uuid];
        if (!food) {
            if (logPetApproaches)
                console.log('Pets ' + petsToFeed.join(',') + ' should be fed, but no food remains.');
        } else {
            if (!pets[name].feedable) {
                if (logPetApproaches)
                    console.log('Pet ' + name + ' approached. No feeding is scheduled but door is open for other pet.');
            } else {
                if (logPetApproaches)
                    console.log('Pets ' + petsToFeed.join(',') + ' are near, dispensing food.');
            }
            door = true;
            openDoor(door);
            request.post({
                url: url,
                form: {
                    dimension: 'door',
                    measure: 'true',
                    notes: 'Bax'
                },
                headers: headers
            }, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body);
                } else {
                    console.log(body);
                }
            });
        }
    } else if (shouldOpen && door) {
        // door stays open..
    } else if (!shouldOpen && door) {
        // time to close door.
        if (logPetApproaches)
            console.log('No pets nearby to feed. Closing dispenser.');
        door = false;
        openDoor(door);
        request.post({
            url: url,
            form: {
                dimension: 'door',
                measure: 'false',
                notes: 'Bax'
            },
            headers: headers
        }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                if (logStatsPosts)
                    console.log(body);
            } else {
                console.log('Error posting to ' + url + ': ' + body);
            }
        });
    }
});

function main() {
    var full = fakeFoodSensor ? true : isFull();
    if (full && !food) {
        food = true;
        request.post({
            url: url,
            form: {
                dimension: 'food',
                measure: 'true',
                notes: 'Bax'
            },
            headers: headers
        }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                if (logStatsPosts)
                    console.log(body);
            } else {
                console.log('Error posting food status to ' + url + ': ' + body);
            }
        });
    } else if (!full && food) {
        food = false;
        request.post({
            url: url,
            form: {
                dimension: 'food',
                measure: 'false',
                notes: 'Bax'
            },
            headers: headers
        }, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                if (logStatsPosts)
                    console.log(body);
            } else {
                console.log('Error posting food status to ' + url + ': ' + body);
            }
        });
    }
    console.log('main loop')
    setTimeout(main, 1000);
}

function isFull() {
    var analogValue = foodSensor.read(); //read the value of the analog pin
    if (logFoodSensor)
        console.log(analogValue); //write the value of the analog pin to the console
    if (analogValue > 10)
        return false;
    else
        return true;
}

function openDoor(open) {
    if (logDoorState)
        console.log('door state set to: ' + open);
    return;
    var angle;
    if (open)
        angle = 460;
    else
        angle = 750;
    var processedValue = MapRange(angle, 0, 1000, Min_Duty_Cycle, Max_Duty_Cycle);
    pwm.write(processedValue); //Write duty cycle value.
    //console.log(angle+" "+processedValue+pwm.read());
}

function MapRange(in_vaule, in_min, in_max, out_min, out_max) {
    var output = (in_vaule - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    if (output >= out_max) {
        output = out_max;
    } else {
        if (output <= out_min) {
            output = out_min;
        }
    }
    return output
}

function processFeedStatus(error, response, body) {
    if (!error && response.statusCode == 200) {
        var resp = JSON.parse(body);
        if (resp.length == 0) {
            if (logFoodStatus)
                console.log('No pets registered');
        } else {
            for (var i = 0; i < resp.length; ++i) {
                var name = resp[i].name,
                    f = resp[i].feedable;
                pets[name].feedable = f;
                if (logFoodStatus)
                    console.log('Feed status: ' + name + ' = ' + f);
            }
        }
    } else {
        console.log('Error, status ' + response.statusCode + ' on GET ' + feed_status_url + ': ' + error);
    }
}

function pollFeedStatus() {
    request(feed_status_url, processFeedStatus);
    console.log('pollFeedStatus')
    setTimeout(pollFeedStatus, 3000);
}

process.on('exit', function(code) {
    Bleacon.stopScanning();
    console.log('About to exit with code:', code);
});

openDoor(door);
pollFeedStatus();
main();
