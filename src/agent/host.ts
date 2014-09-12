// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var sh = require('svchost')
  , shell = require('shelljs')
  , path = require('path');

import env = require('./environment');

// agent must be configured before run as a service
if (!shell.test('-f', path.join(__dirname, '.agent'))) {
	console.error('Agent must be configured.  Run vsoagent configure');
	process.exit(1);
}

var banner = function(str) {
	console.log('--------------------------------------------');
	console.log(str);
	console.log('--------------------------------------------');
}

var formatOutput = function(level, output) {
	return '[' + level + ']' + (new Date()).toTimeString() + ': ' + output;
}

var host = new sh.SvcHost();
host.on('start', function(pid, starts){
	banner('started (' + pid + ') - ' + starts + ' starts');
});

host.on('restart', function(){
	banner('restart.  ');
});		

host.on('exit', function(code, reason){
	banner('exit (' + code + ') : ' + reason);
});	

host.on('abort', function(){
	banner('abort after restarts');
});

host.on('stdout', function(data){
	process.stdout.write(formatOutput('out', data));
});

host.on('stderr', function(data){
	process.stdout.write(formatOutput('err', data));
});

//
// TODO: make more sophisticated.  For example, # failures within time period etc...
// this example is simple - allows 10 starts with a wait of a second per restart in between
//
var maxStarts = 10;
var RESTART_DELAY = 1000;  // 1 sec

var handleRestart = function(starts, relaunch) {
	console.log(starts, 'starts');
	if (starts < maxStarts) {
		console.log('waiting to restart');
		setTimeout(function(){
				relaunch(true);
			}, 
			RESTART_DELAY*starts);			
	} 
	else {
		console.log('fail');
		relaunch(false);
	}
}

// set additional env vars for the service from a file
// then start up the service's host

env.getEnv(path.join(__dirname, 'env.agent'), (err, env) => {
	if (err) {
		console.error(err);
		return;
	}

	console.log(JSON.stringify(env, null, 2));

	host.start(path.join(__dirname, 'vsoagent.js'),
				{ args:process.argv.slice(2), env: env },                       
				handleRestart);  	
});

