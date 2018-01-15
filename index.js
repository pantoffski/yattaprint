require('dotenv').config();
//Printer
const escpos = require('escpos');
const device = new escpos.USB();
const printer = new escpos.Printer(device);
//server
var CronJob = require('cron').CronJob;
const request = require('request');
const fs = require('fs');
const bodyParser = require('body-parser')
const express = require('express');
const app = express();
const server = require('http').Server(app);
app.set('port', (process.env.PORT || 5000));
var root = __dirname + '/public';
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
var insertQ = [];
server.listen(app.get('port'), function () {
  console.log('listening to ' + process.env.PORT);
});
var lastUpdate = 0,
  gunTime = 0;
var genderTotal = [],
  raceCatTotal = [];
var mysql = require('mysql');
var db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'intrun',
  multipleStatements: true
});
request.post({
  url: 'https://yattaweb.herokuapp.com/apinaja/getGunTime'
}, function (err, resp, body) {
  if (err || resp.statusCode != 200) return false;
  gunTime = body * 1;
  var data = body;
  console.log(gunTime);
});
db.connect();
var sqlite3 = require('sqlite3').verbose();
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*, content-type");
  next();
});
app.post('/print', function (req, res) {
  var data = req.body.img.replace(/^data:image\/\w+;base64,/, "");
  var buf = new Buffer(data, 'base64');
  fs.writeFile('image.png', buf, function (res) {
    escpos.Image.load(__dirname + '/image.png', function (image) {
      device.open(function () {
        printer.align('ct').image(image, 'd24').cut().close();
      });
    });
  });
  res.send('ok');
});
app.get('/result/:tagId', function (req, res) {
  var ret = {};
  db.query("select * from runners where tagId=?", [req.params.tagId], function (error, results, fields) {
    //console.log(error);
    if (results.length > 0) {
      ret.name = results[0].name;
      ret.bibNo = results[0].bibNo;
      var raceCat = results[0].raceCat;
      var gender = results[0].gender;
      var chk1 = results[0].chk1;
      var chk2 = results[0].chk2;
      ret.gender = gender;
      ret.chipTime = chk2 - chk1;
      ret.gunTime = chk2 - gunTime;
      db.query("select count(tagId)as catPlace from runners where chk2>0 and chk2<" + chk2 + " and raceCat='" + raceCat + "';select count(tagId)as genderPlace from runners where chk2>0 and chk2<" + chk2 + " and gender='" + gender + "';", function (error, results, fields) {
        ret.catPlace = (results[0][0].catPlace + 1) + ' / ' + raceCatTotal[raceCat];
        ret.genderPlace = (results[1][0].genderPlace + 1) + ' / ' + genderTotal[gender];
        res.send(ret);
      });
      //count gender
      db.query("select count(tagId)as c,gender from runners group by gender", function (error, results, fields) {
        results.map(r => genderTotal[r.gender] = r.c);
      });
      //count raceCat
      db.query("select count(tagId)as c,raceCat from runners group by raceCat", function (error, results, fields) {
        results.map(r => raceCatTotal[r.raceCat] = r.c);
      });
    } else {
      res.status(404).send('no runner');
    }
    //console.log(fields);
  });
});
app.get('/update', function (req, res) {
  getNewData();
  res.send('ok');
});

function getBibNo(raceCat, bibNo, e) {
  return e + raceCat.slice(0, 2) + '-' + ("0000" + bibNo).slice(-4);
}
var isGettingNewData=false;
function getNewData() {
  if (isGettingNewData||insertQ.length > 0) return;
  db.query("select max(updatedAt)as lastUpdate from runners", function (error, results, fields) {
    if (results[0].lastUpdate != null) lastUpdate = results[0].lastUpdate;
    console.log('https://yattaweb.herokuapp.com/apinaja/runners/' + lastUpdate);
    var vals = [];
    isGettingNewData=true;
    request.post({
      url: 'https://yattaweb.herokuapp.com/apinaja/runners/' + lastUpdate
    }, function (err, resp, body) {
      isGettingNewData=false;
      if (err || resp.statusCode != 200) return false;
      var data = JSON.parse(body);
      if (data.length > 0) lastUpdate = data[0].updatedAt;
      console.log('got ' + data.length);
      for (var i in data) {
        vals.push([data[i].name, getBibNo(data[i].raceCat, data[i].bibNo, data[i].e), data[i].gender, data[i].raceCat, data[i].chk1, data[i].chk2, data[i].tagId, data[i].updatedAt]);
      }
      insertQ = [...insertQ, ...vals];
      doInsert();
    });
  });
}

function insertOne(val) {
  return new Promise((resolve, reject) => {
    db.query("insert into runners(name,bibNo,gender,raceCat,chk1,chk2,tagId,updatedAt) values (?) on duplicate key update name=values(name),bibNo=values(bibNo),gender=values(gender),raceCat=values(raceCat),chk1=values(chk1),chk2=values(chk2),updatedAt=values(updatedAt)", [val], function (err) {
      if (err) console.log(err);
      resolve('');
    });
  });
  return n
}

function doInsert() {
  if (insertQ.length > 0) {
    console.log('doInsert');
    var vals = insertQ.splice(0, 100);
    var addJobs = vals.map(v => {
      return insertOne(v)
    });
    Promise.all(addJobs).then((resolve) => {
      console.log('done insert,' + insertQ.length + ' left');
      if (insertQ.length > 0) doInsert();
    });
    //console.log(vals);
  }
}
var newDataCron = new CronJob({
  cronTime: '0-59/10 * * * * *',
  onTick: function () {
    getNewData();
  },
  start: true,
  timeZone: 'Asia/Bangkok',
  runOnInit: false
});
