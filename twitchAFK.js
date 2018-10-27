// Flags
var firstOpen = true;
var refreshing = false;
var spamming = false;

// Default config, no touch pls, use twitchAFKConfig.js instead
var defaultConfig = '/* Config */\n' +
'exports.channel = "sleepydragn1"; // Channel name to AFK at, UNLESS SPECIFIED VIA COMMAND LINE ARGUMENT\n\n' +
'/* Refresh Rate */\n' +
'exports.minRefreshRate = 30; // Minimum rate of how often the page should be refreshed in minutes\n' +
'exports.maxRefreshRate = 45; // Maximum rate of how often the page should be refreshed in minutes\n\n' +
'/* Pause Rate */\n' +
'exports.minPauseRate = 3; // Minimum rate of how often to pause the stream in minutes\n' +
'exports.maxPauseRate = 7; // Maximum rate of how often to pause the stream in minutes\n\n' +
'/* Chat */\n' +
'// Have some respect for your fellow chat members, please do not set the rate below 2 minutes.\n' +
'exports.minChatSpamRate = 3; // Minimum rate of how often to spam chat with a randomized message in minutes\n' +
'exports.maxChatSpamRate = 5;  // Maximum rate of how often to spam chat with a randomized message in minutes\n' +
'exports.chatSpamEnabled = true; // To chat spam, or not to chat spam? true for enabled, false for disabled.\n' +
'exports.chatSpams = [ // Array of randomized messages for chat spam - should be kept in quotes and seperated with a comma\n' +
'	"LUL",\n' +
'	"LUL LUL",\n' +
'	"LUL LUL LUL",\n' +
'	"TPFufun",\n' +
'	"VoteYea",\n' +
'	"VoteYea VoteYea",\n' +
'	"VoteYea VoteYea VoteYea",\n' +
'	"Kappa",\n' +
'	"Kappa Kappa",\n' +
'	"Kappa Kappa Kappa",\n' +
'	"KonCha",\n' +
'	"TehePelo"\n' +
'];\n\n' +
'/* Credentials */\n' +
'exports.username = "AzureDiamond"; // Twitch username\n' +
'exports.password = "hunter2"; // Twitch password';

// Get config
var config;
var fs = require('fs');	
if (fs.isReadable('twitchAFKConfig.js')) {
	config = require('twitchAFKConfig');
	console.log("Got the config!");
} else {
	console.log("No configuration file found, creating a new one...");
	fs.write('twitchAFKConfig.js', defaultConfig, 'w');
	
	config = require('twitchAFKConfig');
	console.log("Got the new, default config.");
}

var channel = config.channel;

// Get channel name from args if possible
var system = require('system');
if (system.args[1]) channel = system.args[1];

// Convert channel name into proper Twitch URL
var streamURL = "https://twitch.tv/" + channel;

var page = require("webpage").create();

// Change user-agent to mask SlimerJS
page.settings.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0";

page.viewportSize = {
    width: 1920,
    height: 1080
};

// Debug function for logging in manually
/*page.open("https://www.twitch.tv", function(status) { });
window.setTimeout(function() {
	openStream();
}, 100000);*/

twitchLogin(openStream);

function twitchLogin(callback) {
    console.log("Logging into Twitch...");
    
    page.open("https://www.twitch.tv", function(status) {
        if (status == "success") {
			// Inject jQuery for maximum crutch
			// Undocumented behavior: injectJs returns true if it's successful, like the original phantomJs specification
			if (page.injectJs('jquery-3.3.1.min.js')) {
				page.evaluate(function() {
					$('.tw-mg-r-1').find('.tw-button')[0].click();
				});
				window.setTimeout(function() {
					//page.switchToFrame('passport');
					
					waitFor(function() {
						return page.evaluate(function() {
							return $('[autocomplete=username]').is(":visible");
						});
					}, function() {
						if (page.evaluate(function() {
							$('[autocomplete=username]').click();
							$('[autocomplete=username]').focus();
							return true;
						})) {
							page.sendEvent('keypress', config.username);
						}
						
						if (page.evaluate(function() {
							$('[autocomplete=current-password]').click();
							$('[autocomplete=current-password]').focus();
							return true;
						})) {
							page.sendEvent('keypress', config.password);
							page.evaluate(function() {
								$('[data-a-target=passport-login-button]').click();
							});
						}
					}, 15000);
				}, 5000);
				window.setTimeout(function() {
					console.log("Logged into Twitch!");
					callback();
				}, 20000);
			}
        } else {
            console.log("Shit, the Twitch homepage failed to load, retrying in 15s");
            window.setTimeout(twitchLogin, 15000);
        }
    });
}

function openStream() {
    refreshing = true;
    
    page.open(streamURL, function() {
        page.switchToMainFrame();
        
		// Inject jQuery for maximum crutch
		if (page.injectJs('jquery-3.3.1.min.js')) {
			if (firstOpen) {
				page.evaluate(function() {
					if($('#mature-link').is(":visible")) $('#mature-link').click();
				});

				waitFor(function() {
					return page.evaluate(function() {
						return $('.player-button.player-button--volume.qa-control-volume').is(":visible");
					});
				}, function() {
					page.evaluate(function() {
						$('.player-button.player-button--volume.qa-control-volume').click();
						$('.player-button.qa-theatre-mode-button').click();
					});
					
					refreshing = false;

					pausePlay();
					if (config.chatSpamEnabled) chatSpam();
					refresh();
				}, 15000);
			} else {
				page.evaluate(function() {
					$('.player-button.qa-theatre-mode-button').click();
				});

				refreshing = false;

				console.log("Stream refreshed!");
			}
		}
    });
}

function pausePlay() {   
    if (!refreshing && !spamming) {
        window.setTimeout(function() {
            console.log("Pausing stream!");
            
            page.evaluate(function() {
                var button = $('.player-button.qa-pause-play-button');

                button.click();
                window.setTimeout(function() {
                    button.click();
                }, Math.floor(5000 + (Math.random() * 12000)));
            });
            pausePlay();
        }, randomRate(config.minPauseRate, config.maxPauseRate));
    } else {
        console.log("Tried to pause during a refresh or spam, waiting 15s...");
        window.setTimeout(pausePlay, 15000);
    }
}

function chatSpam() {
    if (!refreshing) {	
		var rate;
		
		if (config.minChatSpamRate < 2 || config.maxChatSpamRate < 2) {
			rate = randomRate(2, 5);
		} else {
			rate = randomRate(config.minChatSpamRate, config.maxChatSpamRate);
		}
		
		window.setTimeout(function() {
            spamming = true;
			
			var spam = config.chatSpams[Math.floor(Math.random() * config.chatSpams.length)];
            
            console.log("Chat spamming '" + spam + "'!");

			if (page.evaluate(function() {
				var chatInput = $('textarea.tw-textarea.tw-textarea--no-resize');

				chatInput.focus();
				chatInput.click();
				
				return true;
			})) {
				// Put randomized delay between the keystrokes to mask automation
				var i = 0;
				var key = spam[0];
				var pressRate = randomRate(0.00075, 0.00166667);
				var press = function() {
					window.setTimeout(function() {
						page.sendEvent('keypress', key);
						
						i++;
						key = spam[i];
						pressRate = randomRate(0.00075, 0.00166667);
						if (i < spam.length) {
							console.log("GOIN AGAIN");
							press();
						} else {
							// Send it.
							if (page.evaluate(function() {
								// Find dat chat send button
								$('[data-a-target=chat-send-button]').focus();
								return true;
							})) {
								// event.key.Enter doesn't seem to work at all. Very frustrating.
								// event.key.Return creates a newline when focused on the chat input, for some reason, so we need to use the send button
								page.sendEvent('keypress', page.event.key.Return);
							}
						}
					}, pressRate);
				};
				
				press();
			}
			
			spamming = false;
			chatSpam();
        }, rate);
    } else {
        console.log("Tried to spam during a refresh, waiting 15s...");
        window.setTimeout(chatSpam, 15000);
    }
}
    
function refresh() {
	if (firstOpen) {
		window.setTimeout(function() {
			firstOpen = false;
			
			console.log("Refreshing stream!");
			
			openStream();
			refresh();
		}, 600000);
	} else if (!spamming) {
		window.setTimeout(function() {
			console.log("Refreshing stream!");
			
			openStream();
			refresh();
		}, randomRate(config.minRefreshRate, config.maxRefreshRate));
	} else {
		console.log("Tried to refresh during a spam, waiting 15s...");
        window.setTimeout(refresh, 15000);
	}
}

// Stolen from https://github.com/ariya/phantomjs/blob/master/examples/waitfor.js
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat check every 250ms
};

// Used for debug purposes
function screenshot() {
    page.render('currentscreen.png');  
}

function randomRate(min, max) {
    return Math.floor((min + ((max - min) * Math.random())) * 60000);
}