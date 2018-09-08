const express=require('express');
const {Router}=express;
const {mongoose, NewsArticle, User, Comment}=require('../models');
const router=Router();
const _=require('lodash');
const asyncroute=func=>(req,res,next)=>{Promise.resolve(func(req,res,next)).catch(next);};
const bcrypt=require('bcrypt');
const fs=require('fs');
const path=require('path');
const PHONE_TEMPLATE=fs.readFileSync(path.resolve(__dirname, "template.html"), "utf-8");
const fillTemplate = require('es6-dynamic-template');
const ERRORS=_([null, 
{"code": 401, "reason": "Not Logged In!"},
{"code": 403, "reason": "Unauthorized!"},
{"code": 409, "reason": "Duplicated Username!"},
{"code": 401, "reason": "Login Failed!"},
{"code":400, "reason": "Bad Request!"},
{"code": 404, "reason": "News not found!"}
]).map((err, id)=>(err?{"reason": err.reason, "err": id, "_errcode": err.code}:err)).value();
const error=(id, data)=>Object.assign({}, ERRORS[id], {data});
const requireUser=asyncroute(async (req, res, next)=>{
    if(!req.session.uid) next(error(1));
    else {
        const user=await User.findById(req.session.uid).exec();
        if(user){
            req.user=user;
            next();
        }else{
            delete req.session.uid;
            next(error(1));
        }
    }
})

const requireAdmin=asyncroute(async (req, res, next)=>{
    if(!req.session.uid) next(error(1));
    else{
        const user=await User.findById(req.session.uid).exec();
        if(user){
            req.user=user;
            if(user.admin){
                next();
            }else{
                next(error(2));
            }
        }
        else{
            delete req.session.uid;
            next(error(1));
        }
    }
})

router.get("/", (req, res)=>{
    res.status(200).json({"version":"1.0.0"});
})

router.post("/register", asyncroute(async (req, res)=>{
    if(!(req.body.username && req.body.password)) throw error(5);
    const password=await bcrypt.hash(req.body.password, 10);
    try{
        const user=new User({"username": req.body.username, password, "admin": false});
        await user.save();
        res.status(200).json(_.pick(user, ["username", "admin"]));
    }catch(err){
        if(err.name=="MongoError" && err.code==11000){
            throw error(3);
        }else{
            throw err;
        }
    }
}));
router.post("/login", asyncroute(async (req, res)=>{
    if(!(req.body.username && req.body.password)) throw error(5);
    try{
        const user=await (User.findOne({"username": req.body.username}).exec());
        if(!user) throw error(4);
        const test=await bcrypt.compare(req.body.password, user.password);
        if(test){
            req.session.uid=user._id;
            res.status(200).json(_.pick(user, ["username", "admin"]));
        }else throw error(4);
    }catch(err){
        if(err._errcode) throw err;
    }
}));
router.get("/me", requireUser, asyncroute(async (req, res)=>{
    res.status(200).json(_.pick(req.user, ["admin", "username"]));
}));

router.get("/news", asyncroute(async (req, res)=>{
    let before;
    if(req.query.before){
        before=JSON.parse(new Buffer(req.query.before, "base64").toString("utf-8"))
        before.id=mongoose.Types.ObjectId(before.id)
    }
    const pagination_query=before?{
        "$or":[
            {"date": new Date(before.date), "_id": {"$lt": (before.id)}},
            {"date": {"$lt": new Date(before.date)}}
        ]

    }:{}
    const news=await NewsArticle
.find(Object.assign(pagination_query, {"tags": {"$all": [req.query.tag]}}), {"title":1, "description":1, "author":1, "date":1, "related_images": 1})
.sort({"date":-1, "_id": -1}).limit(req.query.limit?Number(req.query.limit):20).exec();
    const nnews=news.map(x=>x.toObject())

    if(nnews.length>0){
    const cursor=new Buffer(JSON.stringify({"date":nnews[nnews.length-1].date, "id": nnews[nnews.length-1]._id})).toString("base64");
    res.header("X-Next-Page", cursor)
    }
    res.status(200).json(nnews);
}));
router.get("/news/:id", asyncroute(async (req, res)=>{

    const news=await NewsArticle
.findOne({"_id": req.params.id}, {"title":1, "description":1, "author":1, "date":1, "cached_content": 1, "related_images": 1, "link": 1})
.exec();
	if(!news) throw error(6);
    const templated_content=fillTemplate(PHONE_TEMPLATE, {"content": news.cached_content, "author": news.author, "title": news.title, "date": news.date})
    news.cached_content=templated_content;
    res.status(200).json(news);
}));
router.get("/news/:id/html", asyncroute(async (req, res)=>{
    const news=await NewsArticle
.findOne({"_id": req.params.id}, {"title":1, "description":1, "author":1, "date":1, "cached_content": 1})
.exec();
	if(!news) throw error(6);
    const templated_content=fillTemplate(PHONE_TEMPLATE, {"content": news.cached_content, "author": news.author, "title": news.title, "date": news.date})

res.type('text/html; charset=utf-8');
    res.status(200).end(templated_content);
}));

const mongo=require('mongodb');
mongo.MongoClient.connect(require('../config').mongo.url,(err, client)=>{
const db=client.db('news_server');
const bucket=new mongo.GridFSBucket(db);

router.get("/images/:token", asyncroute(async (req, res)=>{
	try{
	const stream=bucket.openDownloadStreamByName(req.params.token);
	stream.on('error', (err)=>{
		//console.log(err);
		res.sendStatus(404);
	})
	res.setHeader("content-type", "image/png");

	stream.pipe(res);
	}catch(err){
		console.log(err);
	}
}));



});
module.exports=router;
