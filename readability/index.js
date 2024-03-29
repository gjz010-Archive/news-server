var fs = require('fs');
var cri = require('chrome-remote-interface');

// Readability.js will be injected on page load
function loadReadabilityScript(callback) {
  fs.readFile(__dirname + '/Readability.js', function (err, data) {
    if (err) {
      return callback(err);
    }
    var script = data.toString();
    callback(null, script);
  });
}

function runReadability(instance, callback) {

  // the code below will be converted to string and injected into the chrome instance
  var injection = async function () {
    // *** BROWSER CODE BEGINS***

  async function getBase64Image(img, width, height) {
    console.log(img.src);
    await (new Promise((a, b)=>{
		img.setAttribute("crossOrigin",'Anonymous');
		img.onload=a; 
		img.onerror=b;
		img.src=img.src; 
	}))    
   console.log(img.src);
var canvas = document.createElement("canvas");
canvas.width = width||img.naturalWidth;
canvas.height = height||img.naturalHeight;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var dataURL = canvas.toDataURL("image/png");
    img.onload=(()=>{});
    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
  }


function token() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}
 


    try{
	console.log("Step 1");
    var location = document.location;
    var uri = {
      spec: location.href,
      host: location.host,
      prePath: location.protocol + "//" + location.host, // TODO This is incomplete, needs username/password and port
      scheme: location.protocol.substr(0, location.protocol.indexOf(":")),
      pathBase: location.protocol + "//" + location.host + location.pathname.substr(0, location.pathname.lastIndexOf("/") + 1)
    };

    var readabilityObj = new Readability(uri, document);
    var result = readabilityObj.parse();
	console.log("Step 2");

    if (result) {
	console.log("Step 3");

      document.body.innerHTML = result.content
      console.log(result.content);
      var imgs = document.getElementsByTagName("img");
      var imgSrcs=[];
      for (let i = 0; i < imgs.length; i++) {
        if(imgs[i].src)
	imgSrcs.push((async ()=>{
          const t=token();
		console.log("Loading image "+t);
		let content;
		try{
			content=await getBase64Image(imgs[i]);
		}catch(err){console.log("Image "+t+" failed, removing..."); imgs[i].parentElement.removeChild(imgs[i]); return null;}
		  const ret=({"token": t, "content": content});
		console.log("Image "+t+" loaded");
          	imgs[i].src="https://news.gjz010.com/images/"+t;
		  return ret;
		})());
        else imgs[i].parentElement.removeChild(imgs[i]);

      }
      result.images=(await Promise.all(imgSrcs)).filter(x=>x)
      result.content=document.body.innerHTML;
      console.log("Work Done!");
      return JSON.stringify(result);
    } else {
      return 0;
    }
    }catch(err){
        console.log(err);
        throw err;
    }
    // *** BROWSER CODE ENDS ***
  };

  instance.Runtime.evaluate({'expression': "(" + injection.toString() + ")()", "awaitPromise": true}, function (err, result) {
    console.log("ErrState:"+err);
    if (result.result.value) {
      var article = JSON.parse(result.result.value);
      callback(null, article);
    } else {
      callback(err);
    }

    instance.close();
  });
}

function extract(url, options, callback) {
  if (typeof options === 'function') callback = options;

  cri(function (instance) {
    instance.Network.enable();
    if (options.userAgent) {
      instance.Network.setUserAgentOverride({'userAgent': options.userAgent});
    }

    loadReadabilityScript(function (err, script) {
      if (err) return callback(err);
      instance.Page.addScriptToEvaluateOnLoad({'scriptSource': script});
    });

    instance.Page.domContentEventFired(runReadability.bind(null, instance, callback));
    instance.Page.enable();
    instance.once('ready', function () {
      instance.Page.navigate({url: url});
    });

  });
}

exports.extract = extract;
