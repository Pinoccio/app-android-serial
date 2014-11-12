/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *u
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 d* under the License.
 */

window.onerror = function(e){
  alert('uncaught exception. '+e+' '+e.stack); 
}

var logdiv;

var state = {
  permission:false,
  open:false
};


var app = {
    state:'close',
    // Application Constructor
    initialize: function() {
      logdiv = document.getElementById("log");
      this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {


      window.addEventListener('resize', function(){
        log('resize: h'+window.innerHeight+' w'+window.innerWidth);
      }, false);

      document.addEventListener('deviceready', this.onDeviceReady, false);
      //document.addEventListener('resume',function(){
        // test connection by performing a read and looking for error
        //log("(debug) resume.");
      //})

    },
    updateStatus:function(state,err){

      var z = this;
      try {

        if(state === "error"){
          // show an error
          setTimeout(function(){
            alert("serial error:"+(err.meta?'['+err.meta+']':'')+' '+err);
          },0);

          z._closeSerial(function(){
            z.updateStatus('close');
          });
        }

        var statustext = document.getElementById("status-text");
        var button = document.getElementById("serial-action");
        statustext.textContent = state;

        if(state == 'close') {
          this.state = state;
          button.textContent = "open serial"; 
          z.onStatusClose();
        } else if(state === 'open') {
          this.state = state;
          button.textContent = "close serial"; 
          z.onStatusOpen();
        }

      } catch(e){
        alert("updateStatus "+e);
      }
    },
    _closePages:function(){
      var pages = document.getElementsByClassName("page");
      for(var i=0;i<pages.length;++i){
        pages[i].setAttribute('style',"display:none;");
      }
    },
    loadingDevicePage:function(){
      this._closePages();
      document.getElementById('page-loading').setAttribute("style","display:block;");
    },
    onStatusOpen:function(){
      app.loadingDevicePage();
      this._openSerial(function(err){

        if(err) return app.updateStatus('error',err);

        app._closePages();
        document.getElementById('page-open').setAttribute("style","display:block;");
      });
    },
    onStatusClose:function(){
      app.loadingDevicePage();
      logdiv.innerHTML = "";
      this._closeSerial(function(){
        app._closePages();
        document.getElementById('page-close').setAttribute("style","display:block;");
      });
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
      try{
        var z = app;
        // show page container hide loading!
        var loadingel = document.getElementById('loading');
        loadingel.setAttribute('style','display:none;');

        var pages = document.getElementById('page-cont');
        pages.setAttribute('style','display:block;');

        // bind the status button! 
        var statusButton = document.getElementById("serial-action");
        statusButton.addEventListener('click',function(){
          var change = "close";
          if(z.state == "close") change = "open";
          z.updateStatus(change);
        });

        //  
        var textField = document.getElementById("serial-write");
        var button = document.getElementById("serial-send");

        // extra send button! 
        button.addEventListener('click',function(){
          writeTextFieldData(); 
        });

        // do i have to register a read cb every open/close?
        serial.registerReadCallback(function success(data){
          // TODO use bops when i browserify
          var str = String.fromCharCode.apply(null, new Uint8Array(data));
          logdiv.appendChild(document.createTextNode(str));
        },function error(){
          alert("Failed to register read callback");
        });

      } catch (e) {
        alert('ahhhhh!'+e+' '+e.stack);
      }

      function writeTextFieldData(){
        var val = textField.value+"\n";
        textField.value = "";

        // dont write empty values.
        if(val.length == 1) return;

        log('(debug) writing ',val);
        serial.write(val,function(){
          log('(debug) success');
          d.textContent = "success\n";
        },function(){
          z.updateStatus('error');
          log('(debug) error ',val);
        });
      }

      textField.addEventListener("keypress",function(ev){
        if(ev.which === 13){
          writeTextFieldData();
        }
      });

    },
    _closeSerial:function(cb){
      serial.close(function(){
        cb(false,true);
      },cb);
    },
    _openSerial:function(cb){

      serial.requestPermission({vid:'1d50',pid:'6051'},function success(){
        state.permission = true;

        serial.open({
          baudRate:115200
        },function(successMessage) {
          serial.write("\n\nscout.boot\n");
          serial.read(function(data){
            //this gets fired ONLY when i unplug the scout when i have it open?! weird eh?
            app.updateStatus('error',new Error('scout disconnected or unplugged.'));
          },function(e){
            //
            alert("error read after open "+e)
          });

          cb(false,true);
        },
        function openError(err){

          err.meta = "open error";
          cb(err);
        });

      },function error(err){
        err.meta = "permission error";
        cb(err);
      });
    }
};



function log(){
  var l = arguments.length;
  var str = "";
  for(var i=0;i<l;++i){
    if(typeof arguments[i] == 'object' && arguments[i]) {
      d = dump(arguments[i]);
      d = d.replace(/\n/g,"\n  ");
      str += d;
    } else if(typeof arguments[i] == 'string'){
      str += arguments[i];
    } else {
      
      str += JSON.stringify(arguments[i]);
    }
  }
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  logdiv.appendChild(d);

}

function dump(o){
  var keys = [];

  for(var k in o) {
    keys.push(k+" > "+typeof o[k]);
  }
  return keys.join(",\n");
}


app.initialize();
