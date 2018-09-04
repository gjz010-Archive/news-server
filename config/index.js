const cfg={
    "cookie_token":"TheJabaClassIsVelyVelyGoooood!",
    "mongo":{
        "db":"news_server",
        "host":"127.0.0.1",
        "port":27017,
        "url": ""
    }

}
cfg.mongo.url=`mongodb://${cfg.mongo.host}:${cfg.mongo.port}/${cfg.mongo.db}`;
module.exports=cfg;
