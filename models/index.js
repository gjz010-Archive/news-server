const config=require('../config');
const mongoose=require('mongoose');
const _=require('lodash');
mongoose.connect(config.mongo.url);
const {Schema}=mongoose;
const NewsArticle=new Schema({
    "title": {"type":String, "required": true},
    "author": {"type": String, "required": true},
    "link": {"type": String, "required": true, "unique": true},
    "description": String,
    "date": {"type": Date,"required": true}, 
    "cached_content": String,
    "tags": [String],
    "comments": [{"type": "ObjectId", "ref": "Comment"}],
    "likedCount": {"type": Number, "required": true, "default": 0},
    "commentCount": {"type": Number, "required": true, "default": 0}
});
const User=new Schema({
    "username": {"type": String, "required": true, "unique": true},
    "password": {"type": String, "required": true},
    "admin": {"type": "Boolean", "default": false},
    "likedArticles": [{"type": "ObjectId", "ref": "NewsArticle"}],
    "favCategories": [String],
    "favArticles": [{"article": {"type": "ObjectId", "ref": "NewsArticle"}, "category": String}],
    "loved_tags": [String]
});
const Comment=new Schema({
    "article": {"type":"ObjectId", "ref": "NewsArticle", "required": true},
    "author": {"type": "ObjectId", "ref": "User", "required": true},
    "date": {"type": Date, "required": true},
    "content": {"type":String, "required":true},
    "parent": {"type": "ObjectId", "ref": "Comment"}
});

module.exports=_.mapValues({NewsArticle, User, Comment}, (schema, name)=>mongoose.model(name, schema));
