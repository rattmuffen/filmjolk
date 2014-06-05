var http = require('http');
var fs = require('fs');

var express = require('express');
var app = express();
var async = require('async');

// Default port.
var port = 12345;

try {
	var fanart_api_key = fs.readFileSync('keys/fanarttv', 'utf8');
	var tmdb_api_key = fs.readFileSync('keys/tmdb', 'utf8');
	var	epgio_api_key = fs.readFileSync('keys/epgio', 'utf8');
	var rottentomatoes_api_key = fs.readFileSync('keys/rottentomatoes', 'utf8');
} catch (err) {
	console.log('Please place files containing valid API keys for fanart.tv, tmdb and epg.io under /keys/');
	process.exit(1);
} finally {
	console.log('API keys read successfully.');
	var imdb = require('imdb-api');
	var tmdb = require('moviedb')(tmdb_api_key);
	var tomatoes = require('tomatoes')(rottentomatoes_api_key);
}

app.configure(function () {
	app.use(express.static(__dirname + '/public'));
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
});

// Parse the port number from the command line argument, if specified.
if (process.argv.length >= 3) {
	var p = parseInt(process.argv[2], 10);
	if (!isNaN(p)) {
		port = p;
	}
}
app.listen(port);
console.log('Filmjolk is listening on port ' + port + '.');


app.get('/movies/:channel/date/:date', function (req, res) {
	// Waterfall flow: run functions in series, each passing their results to the next function.
	async.waterfall([
		// First, get movies for a channel and date from json.xmltv.se
		function (callback) {
			getMovies(req.params.channel, req.params.date, function (data) {
				if (data === '') {
					// If no movies on channel, just pass an empty array.
					callback(null, []);
				} else {
					// Pass on movies to next function.
					callback(null, data);
				}
			});
		},
		function (movies, callback) {
			if (movies) {
				async.map(movies, search, function (err, results) {
					callback(null, results);
				});
			}
		},
		// Get TMDb info for each of the movies.
		function (movies, callback) {
			if (movies) {
				async.map(movies, getTMDB, function (err, results) {
					callback(null, results);
				});
			}
		},
		// Get TMDb trailers for each of the movies.
		function (movies, callback) {
			async.map(movies, getTrailer, function (err, results) {
				callback(null, results);
			});
		},
		// Get fanart.tv data for each of the movies
		function (movies, callback) {
			async.map(movies, getFanart, function (err, results) {
				callback(null, results);
			});
		},
		// Get IMDB data for each of the movies
		function (movies, callback) {
			async.map(movies, getIMDB, function (err, results) {
				callback(null, results);
			});
		},
		// Get RT data for each of the movies
		function (movies, callback) {
			async.map(movies, getRT, function (err, results) {
				callback(null, results);
			});
		},
		function (movies, callback) {
			async.map(movies, processMovie, function (err, results) {
				callback(null, results);
			});
		}
	], function (err, result) {

		var data = {movies: result, channel: req.params.channel};
		res.send(data);
	});
});

function getMovies(id, date, callback) {
	var options = {
		host: 'api.epg.io',
		port: 80,
		path: '/2/movies/today/' + date + '/' + id + '?api_key=' + epgio_api_key,
		method: 'GET'
	};

	var req = http.request(options, function (res) {
		var responseBody = "";
		res.setEncoding('utf8');

		res.on('data', function (chunk) {
			responseBody += chunk;
		});

		res.on('end', function () {
			var result;
			try {
				result = JSON.parse(responseBody + '').movies;
			} catch (err) {
				req.end();
				callback('');
			} finally {
				callback(result);
			}
		});
	});
	req.end();
}

function search(item, callback) {
	// TODO: check if tmdb-id or imdb-id already exists before searching.

	tmdb.searchMovie({query: item.series.name}, function (err, result) {
		if (result && result.results.length > 0) {
			item.url = 'http://www.themoviedb.org/movie/' + result.results[0].id;
			item.id = result.results[0].id;
			callback(null, item);
		} else {
			item.id = '';
			callback(null, item);
		}
	});
}

function getTMDB(item, callback) {
	tmdb.movieInfo({id: item.id}, function (err, result) {
		item.tmdb = result;
		callback(null, item);
	});
}

function getTrailer(item, callback) {
	tmdb.movieTrailers({id: item.id}, function (err, result) {
		item.trailer = result;
		callback(null, item);
	});
}

function getIMDB(item, callback) {
	if (item.tmdb) {
		imdb.getReq({ id: item.tmdb.imdb_id }, function (err, info) {
			item.imdb = info;
			callback(null, item);
		});
	} else {
		item.imdb = '';
		callback(null, item);
	}
}

function getFanart(item, callback) {
	var options = {
		host: 'fanart.tv',
		port: 80,
		path: '/webservice/movie/' + fanart_api_key + '/' + item.id + '/JSON/all/limit/1',
		method: 'GET'
	};

	var request = http.request(options, function (resp) {
		var responseBody = "";
		resp.setEncoding('utf8');

		resp.on('data', function (chunk) {responseBody += chunk; });

		resp.on('end', function () {
			request.end();
			item.fanart = parseFanartResult(responseBody);
			callback(null, item);
		});

		resp.on('close', function () {
			request.end();
		});

		resp.on('error', function () {
			request.end();
		});
	});
	request.end();
}

function getRT(item, callback) {
	tomatoes.search(item.series.name, function (err, result) {
		if (result.length > 0) {
			item.rt = result[0];
		} else {
			item.rt = '';
		}

		callback(null, item);
	});
}

// Removes the top JSON-object and shift children to top.
function parseFanartResult(data) {
	data = data.split('{').slice(2).join('{').slice(0, -1);

	if (data === '') { return data; }
	return JSON.parse('{' + data);
}

function processMovie(item, callback) {
	/* Collect all backgrounds in one array */
	var backgrounds = [];

	if (item.tmdb && item.tmdb.backdrop_path) {
		backgrounds.push({'url': 'http://image.tmdb.org/t/p/original' + item.tmdb.backdrop_path});
	}

	if (item.fanart.moviebackground) {
		backgrounds = backgrounds.concat(item.fanart.moviebackground);
	}


	/* Calculate average score */
	var sources = 0;
	var score = 0;

	if (item.imdb && item.imdb.rating) {
		sources += 1;
		score += parseFloat(item.imdb.rating) * 10;
	}

	if (item.tmdb && item.tmdb.vote_average) {
		sources += 1;
		score += item.tmdb.vote_average * 10;
	}

	if (item.rt && item.rt.ratings.audience_score && item.rt.ratings.audience_score !== -1) {
		sources += 1;
		score += item.rt.ratings.audience_score;
	}

	if (item.rt && item.rt.ratings.critics_score && item.rt.ratings.critics_score !== -1) {
		sources += 1;
		score += item.rt.ratings.critics_score;
	}

	/* Get trailer with best quality */
	if (item.trailer && item.trailer.youtube && item.trailer.youtube.length > 0) {
		var best = item.trailer.youtube[0];

		for (var i = 0; i < item.trailer.youtube.length; i++) {
			if (item.trailer.youtube[i].size == 'HD') {
				best = item.trailer.youtube[i];
			}
		};

		item.trailer.best = best;
	}


	item.backgrounds = backgrounds;
	if (sources > 0) {
		item.avg_score = Math.round(score/sources);
	}

	callback(null, item)
}