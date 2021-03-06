let clientPlayer, clientId, playerStates
let isConnected = false
let playersArray = []
let bulletArray = []
let socket

function setup() {
	createCanvas(700, 700).parent('canvasContainer')
	document.querySelector('#canvasContainer canvas').style.height = '90vh'
	document.querySelector('#canvasContainer canvas').style.width = 'auto'
	angleMode(DEGREES)

	socket = io.connect(window.location.href)

	// SETTING PLAYER ID
	socket.on('id', (id) => {
		clientId = id
	})

	// SETTING THE SOCKET TO RECEIVE ALL PLAYERS DATA FROM THE SERVER
	socket.on('heartbeat', (players) => {
		playersArray = players
	})

	// SETTING BULLET INFO SOCKET
	socket.on('enemyShoot', (bulletData) => {
		bulletData.id != clientId ? bulletArray.push(new Bullet(bulletData.posX, bulletData.posY, bulletData.speedX, bulletData.speedY, 0.3, bulletData.id)) : null
	})

	// SETTING UPDATE LEADERBOARD SOCKET
	socket.on('updateLeaderBoard', (_leaderBoard) => {
		updateDomLeaderBoard(_leaderBoard.reverse())
	})

	setJoinButtonEvent()
}

function setJoinButtonEvent() {
	document.querySelector('.connectionContainer .joinButton').addEventListener('click', () => {
		if (isConnected == false && document.querySelector('.connectionContainer .nameInput').value.length >= 1) {
			isConnected = true
			let inputName = document.querySelector('.connectionContainer .nameInput').value
			let inputColor = document.querySelector('.connectionContainer .colorInput').value
			joinParty(inputName, inputColor)
		}
	})
}

// CREATE THE PLAYER AND SEND IT TO THE SERVER
function joinParty(name, color) {
	clientPlayer = new Player(clientId, name, random(width / 10, width / 1.1), random(height / 10, height / 1.1), 30, color)
	playerStates = {
		id: clientPlayer.id,
		name: clientPlayer.name,
		x: clientPlayer.pos.x,
		y: clientPlayer.pos.y,
		cannonDir: { x: clientPlayer.cannonDir.x, y: clientPlayer.cannonDir.y },
		radius: clientPlayer.radius,
		color: clientPlayer.color,
		godMod: false,
	}
	socket.emit('start', playerStates)
}

// DISPLAYING ALL PLAYERS EXCEPT THE CLIENT PLAYER
function playersDisplay() {
	for (const _element of playersArray) {
		if (_element.id != socket.id) {
			if (_element.godMod == false) {
				// ALIVE PLAYER DISPLAY
				stroke('white')
				strokeWeight(1)
				fill(_element.color)
				ellipse(_element.pos.x, _element.pos.y, _element.radius)

				// ALIVE CANNON DISPLAY
				stroke(200)
				strokeWeight(10)
				line(_element.pos.x, _element.pos.y, _element.pos.x + _element.cannonDir.x, _element.pos.y + _element.cannonDir.y)
			} else {
				// DEAD PLAYER DISPLAY
				stroke('rgba(100%,100%,100%,0.3)')
				strokeWeight(1)
				fill('rgba(100%,100%,100%,0.3)')
				ellipse(_element.pos.x, _element.pos.y, _element.radius)

				// DEAD CANNON DISPLAY
				stroke(200)
				strokeWeight(10)
				line(_element.pos.x, _element.pos.y, _element.pos.x + _element.cannonDir.x, _element.pos.y + _element.cannonDir.y)
			}

			// PLAYER NAME DISPLAY
			textAlign(CENTER)
			textSize(15)
			fill('rgba(255, 255, 255, 0.4)')
			noStroke()
			text(_element.name, _element.pos.x, _element.pos.y + 35)
		}
	}
}

// UPDATE POSITION OF THE BULLETS
function bulletsUpdate() {
	// DESTROY BULLETS THAT ARE OUT OF THE SCREEN
	bulletArray = bulletArray.filter((bullet) => bullet.pos.x < width && bullet.pos.x > 0 && bullet.pos.y < height && bullet.pos.y > 0)

	// UPDATE BULLETS POSITION AND DRAW THEM
	for (let i = 0; i < bulletArray.length; i++) {
		bulletArray[i].updatePos()
		bulletArray[i].draw()
	}
}

// TEST COLLISION BETWEEN CLIENT PLAYER AND ENEMY BULLETS
function bulletCollisionTest() {
	if (clientPlayer != undefined) {
		for (const _bullet of bulletArray) {
			if (_bullet.playerId != clientPlayer.id && dist(_bullet.pos.x, _bullet.pos.y, clientPlayer.pos.x, clientPlayer.pos.y) < 25 && clientPlayer.godMod == false) {
				clientPlayer.die()
				let killData = {
					killerId: _bullet.playerId,
					killedId: clientPlayer.id,
				}
				socket.emit('death', killData)
			}
		}
	}
}

// UPDATE DOM LEADERBAORD
function updateDomLeaderBoard(_leaderBoard) {
	let $leaderBoard = document.querySelectorAll('.leaderBoardPlayer')
	let j = _leaderBoard.length

	// IF THERE IS MORE THAN 5 PLAYERS => JUST PASS 5 TIMES TROUGH THE FOR LOOP
	_leaderBoard.length > 5 ? (j = 5) : null

	// UPDATE EACH LINES OF THE LEADERBOARD
	for (let i = 0; i < j; i++) {
		// IF THE RATION CANNOT BE CALCULED (DEATH : 0) => MAKE IT EQUAL 'X'
		$leaderBoard[i].querySelector('.name').innerHTML = _leaderBoard[i].name
		$leaderBoard[i].querySelector('.score').innerHTML = `${_leaderBoard[i].kill} / ${Math.floor(_leaderBoard[i].death)} / ${_leaderBoard[i].ratio >= 100 ? 'X' : Math.round(_leaderBoard[i].ratio * 100) / 100}`
	}
}

// AFK TEST
function afkTest() {
	socket.on('afk', (id) => {
		id == clienId ? (isConnected = false) : null
	})
}

function draw() {
	clear()
	background(51)

	if (isConnected == true) {
		if (clientPlayer.isDead == false) {
			clientPlayer.shootingTest()
			clientPlayer.mapConstrain()
		}
		clientPlayer.updatePos()
		clientPlayer.updateStates()
		clientPlayer.syncClientWithServer()
	}
	playersDisplay()

	bulletsUpdate()
	bulletCollisionTest()
}
