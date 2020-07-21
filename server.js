const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const EventEmitter = require('events');
const { exec } = require('child_process');
const cheerio = require('cheerio');
const fs = require('fs');

//selenium
const webdriver = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
var options = new firefox.Options();
options.addArguments('-headless');
const { Builder } = require('selenium-webdriver')
//Driver initialization
const driver = new webdriver.Builder()
	.forBrowser('firefox')
	.usingServer('http://localhost:4444')
	.setFirefoxOptions(options)
	.build();

/*
 * Classes
 */
class Torrent {
	constructor(name, magnetLink, seeders, leechers) {
		this.name = name;
		this.magnetLink = magnetLink;
		this.seeders = seeders;
		this.leechers = leechers;
		this.progress = "";
	}

	return_progress() {
		var percentage = this.progress.slice(82,85);
		return percentage;
	}
}

/*
 * Functions
 */
async function availableSpace() {
	return new Promise((resolve, reject) => {
		exec("df --output=pcent /home/noot-server/media | tr -dc '0-9'", (err, stdout, stderr) => {
			if (err) {
				reject (err);
				console.log('availableSpace() error');
			}
			else {
				console.log('availableSpace success:' + stdout);
				resolve(stdout);
			}
		})
	})
}

async function incTimesUsed(stats) {
	stats.timesUsed++;
}
async function searchPirateBay(query) {
	return new Promise(async (resolve, reject) => {
		let url = 'https://thepiratebay.org/search.php?q=' + query;
		await driver.get(url);
		await driver.sleep(2000);
		let page_source = await driver.getPageSource();
		console.log('got url');

		//cheerio parsing
		const $ = cheerio.load(page_source);
		let names = $('.list-item.item-name.item-title');
		let seeders = $('.list-item.item-seed');
		let leechers = $('.list-item.item-leech');
		let magnets = $('.item-icons');

		console.log('populating array');
		let torrentArray = [];
		//Should probably use higher order functions here but this works :p
		for (var i=0; i < 10; i++) { //we dont need past 10 search results
			let name = $(names).get(i);
			let nameChild = $(name).children();

			var seeder = $(seeders).get(i+1);
			var seederText = $(seeder).text();
			var leecher = $(leechers).get(i+1);
			var leecherText = $(leecher).text();

			var magnet = $(magnets).get(i+1);
			var magnetChild = $(magnet).children();
			
			//torrent object
			file = new Torrent(nameChild.text(), $(magnetChild).attr('href'), seederText, leecherText);
			torrentArray[i] = file;
			if (i == 9) {
				console.log('populated array');
				resolve(torrentArray);
			}
		}
		
	})
}
async function autoPirate(option) {
	let magnet_link = torrentArray_[option].magnetLink;
	magnet_link = "'"+magnet_link+"'";
	console.log(magnet_link);
	exec('transmission-remote --auth ' + transmissionLogin + ' -a ' + magnet_link, (err, stdout, stderr) => {
		if (err) {
			console.error(err);
		}
		else {
			console.log(`stdout: ${stdout}`)
		}
	})
}
async function showProgress(option) {
	return new Promise(async (resolve, reject) => {
		console.log('executing list command');
		exec('transmission-remote --auth '+ transmissionLogin + ' -l', (err, stdout, stderr) => {
			if (err) {
				console.error(err);
			}
			else {
				let progress = stdout.slice(82,85);
				console.log(progress);
				resolve(progress);
			}
		})
	})
}
async function removeTorrent() {
	console.log('removing torrent');
	exec("transmission-remote --auth " + transmissionLogin + " -t all -r" ,(err, stdout, stderr) => {
		if (err) {
			console.error('transmission-remote remove error');
		}
		else {
			console.log('successfully removed torrent');
			console.log(stdout);
		}
	})
}
/*
 * Variables
 */
let stats = {space: "", timesUsed: 0};
let torrentArray_ = []; //need a _ to differentiate the parameter and the array
let progress_data = {progress: "", name: ""}; //for use in /progress
let transmissionLogin = "transmission:pizzamasterrace4";
/*
 * Http Server
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/views'));
app.set('view engine', 'ejs');

app.listen(3000, () => {
	console.log('media_server_interface listening on port 3000');
})

app.get('/', async (req, res) => {
	res.render('index')
})
app.get('/movie_search', async (req, res) => {
	availableSpace().then(stdout => {
		stats.space = stdout;
		res.render('movie_search', {data:stats})
	})
})
app.get('/underconstruction', (req, res) => {
	res.render('underconstruction');
})
app.post('/search', async (req, res) => {
	let search = await req.body.search;
	console.log('search query:' + search);
	searchPirateBay(search).then(torrentArray => {
		torrentArray_ = torrentArray;
		if (torrentArray[0] == "") {
			console.log('thepiratebay may be down');
		}
		res.render('search', {data:torrentArray});
	})	
})
var choice; //for use in both functions below;
app.post('/choice', async (req, res) => {
	progress_data.progress = ""; //resets value;
	progress_data.name = ""; //resets value
	choice = req.body.choice;
	console.log(choice + 'button pressed');
	await autoPirate(choice);
	res.render('progress', {data: progress_data});
	
})
app.post('/progress', (req, res) => {
	console.log('posting progress');
	showProgress(choice).then(progress => {
		progress_data.progress = progress;
		progress_data.name = torrentArray_[choice].name;
		res.render('progress', {data: progress_data});
	})
})
app.get('/progress', async (req, res) => {
	console.log('getting progress');
	showProgress(choice).then(progress => {
		progress_data.progress = progress;
		progress_data.name = torrentArray_[choice].name;
		res.render('progress', {data:progress_data});
	})
})
app.post('/finished', async (req, res) => {
	console.log('posting finished page');
	removeTorrent();
	res.render('finished', {data:progress_data});
	incTimesUsed(stats);
})
app.get('/finished', async (req, res) => {
	removeTorrent();
})




