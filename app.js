'use strict';

const koa = require('koa');
const serve = require('koa-static');
const router = require('koa-router')();
const koaBody = require('koa-body')();
const send = require('koa-send');
const json = require('koa-json');
const cors = require('koa-cors');

const mongo_url = "mongodb://localhost:27017/TourOfHeroes";
const monk = require('monk');
const wrap = require('co-monk');
const db = monk(mongo_url);
const heroes = wrap(db.get('heroes'));
const counters = wrap(db.get('counters'));

const app = koa();
const origin_request_url = {"origin": "*"};

// Middleware
app.use(cors(origin_request_url));
app.use(serve(__dirname + '/public')); //establish static deliver from ./public
app.use(json());
app.use(router.routes());

// Utility functions
let getNextSequence = function *(name) {
  //var ret = yield counters.findAndModify({query: {name: name}, update:{$inc: {seq: 1} }, new: true });
  var ret = yield counters.findOneAndUpdate( {'name': name}, {$inc: {seq: 1} }, { returnNewDocument: true });
  console.log('New sequence: ' + ret.seq);
  return ret.seq;
}

// CRUD routes

// Create
router.post('/api/create-hero', koaBody, function *(){
  this.body = yield heroes.insert({id: yield getNextSequence('heroes'), name: this.request.body.name});
  console.log('New hero created: ' + JSON.stringify(this.body));
});

// Read
router.get('/api/heroes', function *(){ 
  this.body = {data: yield heroes.find({}, '-_id')};
  console.log('Heroes retrieved: ' + JSON.stringify(this.body));
});

// Update
router.put('/api/update-hero/:id', koaBody, function *(){

  let id = parseInt(this.params.id);
  let heroName = this.request.body.name;

  let selector = {'id': id};
  let setter = {'id': id, 'name': heroName};

  this.body = yield heroes.update(selector, setter);
  console.log('Hero updated: ' + JSON.stringify(this.body));
});

// Delete
router.del('/api/delete-hero/:id', function *(){
  let id = parseInt(this.params.id);
  this.body = yield heroes.remove({id: id});
  console.log('Hero deleted: ' + JSON.stringify(this.body));
});

// Search route
router.get('/api/hero-search', koaBody, function *(){
  let regexStr = `.*${this.query.name}.*`;
  let result = yield heroes.find({"name" : {$regex : regexStr}});

  this.body = {"data": result}
});

// Default route
app.use(function *() {
  yield send(this, './public/index.html');
});

// start listening...
app.listen(3333);