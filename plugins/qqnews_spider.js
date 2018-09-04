const axios=require('axios');
const iconv=require('iconv');
const fs=require("fs");
const bluebird=require('bluebird');
const path=require('path');
bluebird.promisifyAll(fs);
const _=require('lodash');
const {parseStringAsync}=bluebird.promisifyAll(require('xml2js'));
//const r=require('node-readability');
//const read = (...args)=>new Promise((a, b)=>r(...args, (err, article, meta)=>{if(err) b(err); else a({article, meta}); }))
//const Readability=require('readability');
//const {JSDOM}=require('jsdom');
const chrome=require('../readability');
bluebird.promisifyAll(chrome);
const validURL=require('valid-url');
const decode=(buf)=>{
    try{
        const decoder=new iconv.Iconv("gbk", "utf-8");
        return decoder.convert(buf).toString("utf-8");
    }catch(err){
        return buf.toString("utf-8");
    }
}
const curl=(url)=>axios({url, responseType: 'arraybuffer'}).then(x=>decode(x.data))
const extract=(obj, dft="")=>obj?obj[0]:dft
const loadNewsFromRSS=async (body)=>{
    //console.log(body)
    const data=await curl(body.link);
    //console.log(data);
    const dom=await parseStringAsync(data);
    return (dom.rss.channel[0].item.map(x=>({
        "title": extract(x.title, "[NOTITLE]"),
        "date": new Date(extract(x.pubDate, new Date("2018-08-10 11:45:14"))),
        "description": extract(x.description, extract(x.title, "[NOTITLE]")),
        "author": extract(x.author, "news.qq.com"),
        "link": extract(x.link, "https://notfound.example.com/"),
        "type":body.name, "basename": body.basename
    })));
}

module.exports=async (options)=>{
    const channels=JSON.parse(await fs.readFileAsync(path.resolve(__dirname, './qqrss.json'), 'utf-8'));
    const news=await Promise.all(channels.map((x)=>loadNewsFromRSS(x)))
    const flattened_news=_.concat(...news);
    const url_pattern=/http(s)?\:\/\/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
    console.log("TEST", validURL);
    const flattened_news_new=flattened_news.filter(x=>validURL.isUri(x.link)).filter(x=>x.date>new Date("2018-09-01"));
    const fetch_sample=_.sampleSize(flattened_news_new, 10);
    for(const sample of fetch_sample){
        console.log(sample)
        console.log(await chrome.extractAsync(sample.link));
    }
    return flattened_news_new;
}


if (require.main === module) {
    module.exports().then(console.log)
}
