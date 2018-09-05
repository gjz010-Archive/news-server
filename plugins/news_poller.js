const {NewsArticle, mongoose}=require('../models');
const chrome=require('../readability');
const bluebird=require('bluebird');
bluebird.promisifyAll(chrome);

const mongo=require('mongodb');
mongo.MongoClient.connect(require('../config').mongo.url,(err, client)=>{
const db=client.db('news_server');
const bucket=new mongo.GridFSBucket(db);

async function writeFile(name, b64){
    const ret=new Promise((a,b)=>{
	console.log('uploading '+name);
        const buf=new Buffer(b64, "base64");
	const stream=bucket.openUploadStream(name);
	stream.on('end', ()=>{
		console.log("end");
	})
	stream.on('error', b)
	stream.on('finish', (file)=>{
		console.log(file.filename, " written to db.");
		a();
	});
	stream.end(buf);
    });
    
    await ret;
}
async function poll(){
    while(true){
        const news=await NewsArticle.findOne({"cached_content":{"$eq":null}}, {"title":true, "link":true});
        if(!news){
		console.log("No news!");
		continue;
	}
        console.log(news);
	const content=await chrome.extractAsync(news.link);
	//console.log(content);
        if(content){
		news.cached_content=content.content;
		news.cached_textcontent=content.textContent;
                const images=content.images;
		await Promise.all(images.map(x=>writeFile(x.token, x.content)));
                news.related_images=images.map(x=>x.token)
		await news.save();
		
	}
	else{
		console.log("Bad News!");
                news.cached_content="暂不支持该新闻的转码，请查看未转码版本。";
                news.cached_textcontent="暂不支持该新闻的转码，请查看未转码版本。";
                await news.save();
	}
    }
}


poll();


});
