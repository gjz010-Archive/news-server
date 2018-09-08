const express=require('express');
const app=express();
const config=require('./config');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
const modelss=require('./models');
const _=require('lodash');
app.use(session({
    "secret":config.cookie_token,
    "key": config.mongo.db,
    "resave": false,
    "saveUninitialized": true,
    "store": new MongoStore(config.mongo),
    "cookie": {"maxAge": 1000*60*60*24*30},
}));
app.use(require('body-parser').json())
app.use(require('./routes'))
app.set("json spaces", 2)


app.use(function (err, req, res, next) {
    console.log("err");
    if(err._errcode){
        console.log(err);
        res.status(err._errcode).json(_.pick(err, ["err", "reason", "data"]));
    }else{
        console.log("500!");
        console.log(err.stack);
        res.status(500).send('Something broke!')
    }
})

app.listen(55555, ()=>{
    console.log("news server listenting at port 55555.");
});
