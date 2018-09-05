const {NewsArticle}=require('../models');
const chrome=require('../readability');
const bluebird=require('bluebird');
bluebird.promisifyAll(chrome);
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
