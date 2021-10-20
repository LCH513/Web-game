var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var mysql = require('mysql');
var cons = 0;
var scale = 25;
var snakes = [];
app.listen(3001);3
var row = 725/25;
var explainA=[];
var player1;
var player2;

//防止載入時DB重新計算
var dbcount = 0;

//成語陣列,成語出現次數,成語錯誤次數
var completeQ = [];
var completeQ_app_count = [];
var completeQ_err_count = [];

//成語解釋陣列
var explainQ = [];

//顯示出的成語解釋
var explainT;

function handler (req, res) {
	console.log('starting');
	fs.readFile(__dirname + '/index.html' , function(err,data)  {
        if (err) {
            res.writeHead(500);
            return res.end('Loading Error index.html');
        }    
		else{
			res.writeHead(200);
			res.end(data);
		}
    });
};



var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  port:3306,
  database: "mydb"
});


con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");

  
});

var ans_flag;
var selec_flag;

//選擇題目




var selec1 = [];
var selec2 = [];
var selec3 = [];
var selec4 = [];
//成語切割後的字放入的陣列
var ansa = 0;
//成語切割後的字放入的陣列
var ansarr=[];




io.sockets.on('connect', function (socket) {
	
	socket.on('servertopic',function(t){
		//當玩家為2人時才載入資料(以免重複選擇題目)
		if(cons == 2){
			//將題庫資料載入
			for(var i = 0; i < t.length; i++){
				completeQ[i] = t[i].question_q;
				completeQ_app_count[i] = t[i].appear_num;
				completeQ_err_count[i] = t[i].error_num;
				explainQ[i] = t[i].ques_explain;
			}
			//選擇題目
			selec_flag = Math.floor(Math.random()*(completeQ.length));
			console.log(selec_flag);
			//切割成語completeQ
			ansa = completeQ[selec_flag].split("");
			completeQ_app_count[selec_flag] += 1;
			for(var i = 0; i < 4; i++){				
				ansarr.push(ansa[i]);
				console.log(ansarr[i]);
			}
			//成語位置布置
			selec1 = {
				s: ansarr[0],
				x: (Math.floor(Math.random() * row-1)+1) * scale,
				y: (Math.floor(Math.random() * row-1)+2) * scale
			};
			selec2 = {
				s: ansarr[1],
				x: (Math.floor(Math.random() * row-1)+1) * scale,
				y: (Math.floor(Math.random() * row-1)+2) * scale
			};
			selec3 = {
				s: ansarr[2],
				x: (Math.floor(Math.random() * row-1)+1) * scale,
				y: (Math.floor(Math.random() * row-1)+2) * scale
			};
			selec4 = {
				s: ansarr[3],
				x: (Math.floor(Math.random() * row-1)+1) * scale,
				y: (Math.floor(Math.random() * row-1)+2) * scale
			};
			explainT = explainQ[selec_flag];
		}
	});
	socket.on('start', function(name){
		// Broadcast sends message to everyone but the current user.
		cons += 1;
		var st = name + ' 進入遊戲';
		con.query("SELECT * FROM question;", function (err, result,filed) {
			if (err){
				throw err;	
			} else{
				socket.emit('topic',result);
			}
		});
		
		io.sockets.emit('announce',{name,st,cons});
		//玩家1名稱
		if(cons == 1){
			player1 = name;
		}
		//玩家2名稱
		if(cons == 2){
			player2 = name;
		}
		console.log(player1,player2);
		console.log(cons);
	});
	//蛇的資料
	snakes.push({
        id: socket.id,
        x: 0,
        y: 0,
        vx: 1,
        vy: 0,
        length: 0,
        highscore: 0,
        bodyParts: [],
		anscount: 1,
        directionChanged: false,
		error_count: 0,
		correct_count: 0
    });
	//控制移動
	socket.on("move", function (data) {
		var snake = getSnakeByID(socket.id);
		if (data.direction == "up" && snake.vy != 1) {
			snake.vx = 0;
			snake.vy = -1;
		} 
		else if (data.direction == "down" && snake.vy != -1) {
			snake.vx = 0;
			snake.vy = 1;
		} 
		else if (data.direction == "left" && snake.vx != 1) {
			snake.vx = -1;
			snake.vy = 0;
		} 
		else if (data.direction == "right" && snake.vx != -1) {
			snake.vx = 1;
			snake.vy = 0;
		}
		snake.directionChanged = true;
	});
	socket.on("disconnect", function () {
		console.log("a client has disconnected: " + socket.id);
		for (var i = 0; i < snakes.length; i++) {
			if (snakes[i].id == socket.id) {
				snakes.splice(i, 1);
			}
		}
		io.sockets.emit('stopgame');
		process.exit(0);
	});

	socket.on('test',function(){
		update();
		eatcandy();
		io.sockets.emit("drawsnakes",{snakes:snakes,selec1:selec1,selec2:selec2,selec3:selec3,selec4:selec4,explainT,explainA,player1,player2});
		io.sockets.emit("counts",cons);
	});

	//資料載入DB
	socket.on('InsertData',function(){
		if(dbcount != 1){
			var sql = "INSERT INTO player (username, score, error_num, correct_num) VALUES (?,?,?,?)";
			var sqldata1=[player1,snakes[0].highscore,snakes[0].error_count,snakes[0].correct_count];
			con.query(sql,sqldata1, function (err, result) {
				if (err){
					throw err;
				}
				console.log("1 record inserted");
			});
		
			var sqldata2=[player2,snakes[1].highscore,snakes[1].error_count,snakes[1].correct_count];
			con.query(sql,sqldata2, function (err, result) {
				if (err){
					throw err;
				}
				console.log("1 record inserted");
			});

			for(var i = 0; i < completeQ_app_count.length; i++){
				var app_count = completeQ_app_count[i];
				var err_count = completeQ_err_count[i];
				var pr = completeQ[i];
				var sql = "UPDATE question SET appear_num = ?,error_num = ? WHERE question_q = ?";
				var sqldata =[app_count,err_count,pr]
				con.query(sql,sqldata, function (err, result) {
					if (err){
						throw err;
					}
					console.log(result.affectedRows + " record(s) updated");
				});
				console.log(completeQ_app_count[i]);
			}
		}
		dbcount+= 1;
		
		
		
	});

	
	//蛇的移動
	function update(){
		var snake = getSnakeByID(socket.id);
		try{
			for(var i = 0; i < snake.bodyParts.length - 1; i++){
				snake.bodyParts[i] = snake.bodyParts[i + 1];
			}
			
			snake.bodyParts[snake.length - 1] = {x:snake.x,y:snake.y};
			snake.x += snake.vx * scale;
			snake.y += snake.vy * scale;
			if(snake.x >= 750){
				snake.x = 0;
			}
			if(snake.x < 0){
				snake.x = 750;
			}
			if(snake.y >= 750){
				snake.y = 0;
			}
			if(snake.y < 0){
				snake.y = 750;
			}
				
			
		}
		catch(e){
			console.log(e);
		}
		

	};

	//吃題目和重新布置題目
	function eatcandy(){
		
		var snake = getSnakeByID(socket.id);
		if(snake.x == selec1.x && snake.y == selec1.y){
			//吃錯扣5分,成語重新選擇和布置
			if(snake.anscount != 1){
				snake.highscore = snake.highscore-5;
				completeQ_err_count[selec_flag] += 1;
				snake.error_count += 1;
				explainA.push(completeQ[selec_flag]);
				console.log(explainA);
				selec1.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec1.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec2.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec2.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec3.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec3.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec4.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec4.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec_flag = Math.floor(Math.random()*(completeQ.length));
				console.log("test1");
				console.log(selec_flag);
				ansa = completeQ[selec_flag].split("");
				completeQ_app_count[selec_flag] += 1;
				console.log(ansa);
				
				console.log(ansarr);
				selec1.s = ansa[0];
				selec2.s = ansa[1];
				selec3.s = ansa[2];
				selec4.s = ansa[3];
				
				for (var i = 0; i < snakes.length; i++){
					snakes[i].anscount = 1;
				}
				explainT = explainQ[selec_flag];
			}
			//吃對加5分,此題繼續
			else{
				
				selec1.s = "";
				selec1.x = null;
				selec1.y = null;
				for (var i = 0; i < snakes.length; i++){
					snakes[i].anscount = 2;
				}
				snake.highscore = snake.highscore+5;
				snake.correct_count += 1;
			}

		}
		if(snake.x == selec2.x && snake.y == selec2.y){
			if(snake.anscount != 2){
				snake.highscore = snake.highscore-5;
				completeQ_err_count[selec_flag] += 1;
				snake.error_count += 1;
				explainA.push(completeQ[selec_flag]);
				console.log(explainA);
				selec1.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec1.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec2.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec2.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec3.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec3.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec4.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec4.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec_flag = Math.floor(Math.random()*(completeQ.length));
				console.log("test2");
				console.log(selec_flag);
				ansa = completeQ[selec_flag].split("");
				completeQ_app_count[selec_flag] += 1;
				console.log(ansa);
				
				selec1.s = ansa[0];
				selec2.s = ansa[1];
				selec3.s = ansa[2];
				selec4.s = ansa[3];
				for (var i = 0; i < snakes.length; i++){
					snakes[i].anscount = 1;
				}
				explainT = explainQ[selec_flag];
			}
			else{
				selec2.s = "";
				selec2.x = null;
				selec2.y = null;
				for (var i = 0; i < snakes.length; i++){
					snakes[i].anscount = 3;
				}
				snake.highscore = snake.highscore+5;
				snake.correct_count += 1;
			}

		}
		if(snake.x == selec3.x && snake.y == selec3.y){
			if(snake.anscount != 3){
				snake.highscore = snake.highscore-5;
				completeQ_err_count[selec_flag] += 1;
				snake.error_count += 1;
				explainA.push(completeQ[selec_flag]);
				console.log(explainA);
				selec1.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec1.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec2.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec2.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec3.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec3.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec4.x = (Math.floor(Math.random() * row-1)+1) * scale;
				selec4.y = (Math.floor(Math.random() * row-1)+2) * scale;
				selec_flag = Math.floor(Math.random()*(completeQ.length));
				console.log("test3");
				console.log(selec_flag);
				ansa = completeQ[selec_flag].split("");
				completeQ_app_count[selec_flag] += 1;
				console.log(ansa);
				
				selec1.s = ansa[0];
				selec2.s = ansa[1];
				selec3.s = ansa[2];
				selec4.s = ansa[3];
				for (var i = 0; i < snakes.length; i++){
					snakes[i].anscount = 1;
				}
				explainT = explainQ[selec_flag];
			}
			else{
				selec3.s = "";
				selec3.x = null;
				selec3.y = null;
				for (var i = 0; i < snakes.length; i++){
					snakes[i].anscount = 4;
				}
				snake.highscore = snake.highscore+5;
				snake.correct_count += 1;
			}

		}
		if(snake.x == selec4.x && snake.y == selec4.y){
			if(snake.anscount != 4){
				snake.highscore = snake.highscore-5;
				completeQ_err_count[selec_flag] += 1;
				snake.error_count += 1;
				explainA.push(completeQ[selec_flag]);
				console.log(explainA);
			}
			else{
				snake.highscore = snake.highscore+5;
				snake.correct_count += 1;
			}
			selec1.x = (Math.floor(Math.random() * row-1)+1) * scale;
			selec1.y = (Math.floor(Math.random() * row-1)+2) * scale;
			selec2.x = (Math.floor(Math.random() * row-1)+1) * scale;
			selec2.y = (Math.floor(Math.random() * row-1)+2) * scale;
			selec3.x = (Math.floor(Math.random() * row-1)+1) * scale;
			selec3.y = (Math.floor(Math.random() * row-1)+2) * scale;
			selec4.x = (Math.floor(Math.random() * row-1)+1) * scale;
			selec4.y = (Math.floor(Math.random() * row-1)+2) * scale;
			selec_flag = Math.floor(Math.random()*(completeQ.length));
			console.log("test4");
			console.log(selec_flag);
			ansa = completeQ[selec_flag].split("");
			completeQ_app_count[selec_flag] += 1;
			console.log(ansa);
			
			selec1.s = ansa[0];
			selec2.s = ansa[1];
			selec3.s = ansa[2];
			selec4.s = ansa[3];
			for (var i = 0; i < snakes.length; i++){
					snakes[i].anscount = 1;
			}
			explainT = explainQ[selec_flag];

		}


	}
});

//哪位玩家
function getSnakeByID(id) {
    for (var i = 0; i < snakes.length; i++) {
        if (id == snakes[i].id) {
            return snakes[i];
        }
    }
}










