const express = require('express')
const app = express()
const cors = require('cors')
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
app.use(cors())
app.use(express.static('public'))
app.use(express.json())
app.get('/', (req, res) => 
{
  res.sendFile(__dirname + '/views/index.html')
});
app.post('/api/users/slack', urlencodedParser, async function(req, res)
{
	console.log(req.body)
	res.send(req.body.challenge)
});
app.post('/api/users', urlencodedParser, async function(req, res)
{
	console.log("post  : "+'/api/users')
	const collections = db.collection('exercisetracker').doc('userdata');
	var user = req.body.username;
	var result = {};
	const doc = await collections.get();
	if (!doc.exists) 
	{
	  console.log('No such document!');
	  res.json({ error: 'error occured' });
	} 
	else 
	{
		var index = doc.data()['index']
		var list = doc.data()['usernames'];
		var ids = doc.data()['ids'];
		var exercises = doc.data()['exercises'];
		if(list.includes(user))
		{
			res.send("Username already exists")
		}
		else
		{
			list.push(user);
			ids.push(index);
			exercises[index] = []
			index = index+1;
			const push = await collections.update({usernames:list,index:index,ids:ids,exercises:exercises});
			result["username"] = user;
			result["_id"] = index-1;
		}
	}
	console.log(result)
	await res.json(result);
});

app.get('/api/users', async (req, res) => 
{
	console.log('/api/users')
 	const collections = db.collection('exercisetracker').doc('userdata');
	var result = [];
	const doc = await collections.get();
	if (!doc.exists) 
	{
	  console.log('No such document!');
	  res.json({ error: 'error occured' });
	} 
	else 
	{
		length = doc.data()['index'];
		var list = doc.data()['usernames'];
		var ids = doc.data()['ids'];
		for(var i=0; i<length; i++)
		{
			var obj = {};
			obj["_id"] = ids[i].toString();
			obj["username"] = list[i].toString();
			obj["__v"] = "0";
			result.push(obj);
		}
		console.log(result)
		res.send(result);
	}
});

app.post('/api/users/:id?/exercises',urlencodedParser ,async (req, res) => 
{
	console.log('/api/users/:id?/exercises');
	req_id = req.params.id;
	console.log(req_id)
	console.log(req.body.date)
	const collections = db.collection('exercisetracker').doc('userdata');
	result={}
	const doc = await collections.get();
 	if (!doc.exists) 
	{
	  console.log('No such document!');
	  res.json({ error: 'error occured' });
	} 
	else 
	{

		var ids = doc.data()['ids'];
		var exercises = doc.data()['exercises'];
		if(ids.includes(parseInt(req_id)))
		{
			obj = {}
			obj["description"] = req.body.description
			obj["duration"] = req.body.duration
			if(!req.body.date)
			{
				obj["date"] = (new Date()).toDateString();
			}
			else
			{
				obj["date"] = (new Date(req.body.date)).toDateString();
			}
			exercises[req_id].push(obj);
			exercises[req_id].sort(function(a,b){return (new Date(a["date"])) - new Date(b["date"])})
			const push = await collections.update({exercises:exercises});
			result["_id"] = ids[req_id]
			result["username"] = doc.data()["usernames"][req_id]
			result["date"] = obj["date"]
			result["duration"] = parseInt(obj["duration"])
			result["description"] = obj["description"]
			console.log(result)
			res.json(result)
		}
		else
		{
			res.send("Cast to ObjectId failed for value "+req_id+' at path "_id" for model "Users"')
		}
	}
});

app.get('/api/users/:id?/logs', async (req, res) => 
{
	console.log('/api/users/:id?/logs')
	var req_id = req.params.id;
	console.log(req_id)
	console.log(req.query)
	var limit = 2
	if(req.query.limit)
	{
		limit = req.query.limit
	}
	var from = new Date("1900-01-01");
	if(req.query.from)
	{
		from = new Date(req.query.from)	
	}
	var to = new Date("9999-12-31");
	if(req.query.to)
	{
		to = new Date(req.query.to)	
	}
	const collections = db.collection('exercisetracker').doc('userdata');
	result={}
	const doc = await collections.get();
 	if (!doc.exists) 
	{
	  console.log('No such document!');
	  res.json({ error: 'error occured' });
	} 
	else 
	{
		var ids = doc.data()['ids'];
		var exercises = doc.data()['exercises'];
		if(ids.includes(parseInt(req_id)))
		{
			result["_id"] = ids[req_id]
			result["username"] = doc.data()["usernames"][req_id]
			if(req.query.from)
			{
				result["from"] = (new Date(req.query.from)).toDateString();	
			}
			if(req.query.to)
			{
				result["to"] = (new Date(req.query.to)).toDateString();
			}
			result["count"] = exercises[req_id].length
			result["log"] = [];
			for(var i=0; i<result["count"] && limit>result["log"].length; i++)
			{
				d = new Date(exercises[req_id][i]["date"])
				if(from<=d && to>=d)
				{
					result["log"].push(exercises[req_id][i])
				}
			}
			result["count"] = result["log"].length
			console.log(result)		
			res.send(result);
		}
		else
		{
			res.send("Cast to ObjectId failed for value "+req_id+' at path "_id" for model "Users"')
		}
	}
});

const listener = app.listen(process.env.PORT || 3000, () => 
{
  console.log('Your app is listening on port ' + listener.address().port)
})
