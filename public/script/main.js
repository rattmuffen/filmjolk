$(document).ready(function() {
	// Prevent double-click to select.
	$(document).mousedown(function(){ event.preventDefault(); });

	// Set trailer window size at window resize.
	$(window).resize(function() {
		var viewportWidth = $(window).width();
		var trailerWidth = viewportWidth * 0.7;
		var trailerHeight = trailerWidth * (9/16);

		$('.js-lazyYT').attr({'data-width': trailerWidth, 'data-height':trailerHeight });
		$('.trailer-dialog').css({'width':trailerWidth});
	}).resize();

	// Start swap backgrounds when slide complete.
	$('#movie-carousel').on('slid.bs.carousel', function () {
		// Get index of active movie.
		var activeIndex = $('#movie-carousel').data("bs.carousel").getActiveIndex() - 1;

		// Only start swap backgrounds when > 1 available and not already started.
		if ($('.'+activeIndex+'-bg-image').length > 1 && $('#'+activeIndex+'-bgContainer').attr('started') != 'true') {
			$('#'+activeIndex+'-bgContainer').attr({'started': true});

			setInterval(function(){
				$('.'+activeIndex+'-bg-image').last().fadeOut(5000, function(){
					$this = $(this);
					$parent = $this.parent();
					$this.remove().css('display','block');
					$parent.prepend($this);
				});
			}, 15000);
		}
    });
});

function Filmjolk($scope, $http) {
	$scope.movies = [];
	$scope.recMovies = [];
	$scope.recIndex = -1;
	$scope.day = 0;

	$scope.channels = [];
	$scope.allChannels = [
		{name: 'SVT1',		id:'251'},
		{name: 'SVT2',		id:'253'},
		{name: 'TV3',		id:'286'},
		{name: 'TV4',		id:'294'},
		{name: 'Kanal 5',	id:'163'},
		{name: 'TV6',		id:'305'},
		{name: 'TV4 Film',	id:'297'}
	];

	$scope.displayAired = true;

	// On startup...
	angular.element(document).ready(function () {
		// Get channels from localStorage.
		$scope.getChannelsFromStorage();
	});

	// Adds or removes a channel from channel array.
	$scope.toggleChannel = function(channel) {
		var index = $scope.indexOfChannel(channel);

		if (index == -1) {
			$scope.channels.push(channel);
		} else {
			$scope.channels.splice(index,1);
		}
	}

	// Get channels from localStorage.
	$scope.getChannelsFromStorage = function() {
		if(typeof(Storage)!=='undefined') {
			if (localStorage.getItem('channels') != null) {

				$scope.channels = JSON.parse(localStorage.getItem('channels'));
				console.log($scope.channels);
				$scope.getMovies();
			}
		}
	}

	// Save channel array to localStorage.
	$scope.saveChannelsToStorage = function() {
		if(typeof(Storage)!=='undefined') {
			localStorage.setItem("channels", JSON.stringify($scope.channels));
		}
		$scope.getMovies();
	}

	// Gets index of channel in channel array based on id.
	$scope.indexOfChannel = function(channel) {
		for (var i = 0; i < $scope.channels.length; i++) {
			var c = $scope.channels[i];
			if (c.id === channel.id) return i;
		};

		return -1;
	}

	// Gets channel name from channel id.
	$scope.getChannelName = function(channel) {
		for (var i = 0; i < $scope.allChannels.length; i++) {
			if (channel == $scope.allChannels[i].id) {
				return $scope.allChannels[i].name;
			}
		};
		return channel;
	}

	$scope.getMovies = function() {
		// Reset arrays and counters.
		$scope.recMovies = 0;
		$scope.movies = [];
		$scope.recIndex = -1;

		// Toggle UI elements while fetching movies and slide to start.
		$('#movie-carousel').carousel(0);
		$('#leftControl').hide();
		$('#rightControl').hide();
		$('#loading-bar').css('width','0%').attr('aria-valuenow', '0');
		$('#loadProgress').fadeIn();

		// Array containing channels that movies have been fetched for.
		completedChannels = [];

		console.log('Started fetching movies...')
		for (var i = 0; i < $scope.channels.length; i++) {
			var channel = $scope.channels[i].id;

			$http.get('/movies/' + channel + '/date/' + $scope.getDateString($scope.day))
				.success(function(data) {
					// Keep track of which channels has been fetched.
					if (completedChannels.indexOf(data.channel) == -1)
						completedChannels.push(data.channel);

					// Add recieved movies.
					$scope.movies = $scope.movies.concat(data.movies);

					// Update loading bar.
					var w = (parseFloat(completedChannels.length)/parseFloat($scope.channels.length)) * 100;
					$('#loading-bar').css('width',w +'%').attr('aria-valuenow', w);

					// If all channels has been fetched...
					if (completedChannels.length == $scope.channels.length) {
						console.log($scope.movies);

						// Sort movies by time.
						$scope.sortByTime();

						// Sort and set recommendation array.
						$scope.setRecomendations();

						// Toggle UI elements and slide to start.
						$("#start-slide").addClass('active');
						$("#start-indicator").addClass('active');
						$("#leftControl").fadeIn();
						$("#rightControl").fadeIn();
						$("#loadProgress").fadeOut();
						$('#movie-carousel').carousel(0);
					}
				})
				.error(function(data) {
					console.log('Error: ' + data);
				});
		};
	}

	// Sort movie array by rating.
	$scope.setRecomendations = function() {
		var m = $scope.movies.concat(); // Get copy.
		m.sort(function(a,b) {
			if (!a.avg_score) return 1;
			if (!b.avg_score) return -1;

			return ((a.avg_score > b.avg_score) ? -1 : ((a.avg_score < b.avg_score) ? 1 : 0));
		});

		$scope.recMovies = m;
	}

	// Sort movie array by start time.
	$scope.sortByTime = function() {
		$scope.movies.sort(function(a,b) {
			var d1 = new Date(a.programme.start * 1000);
			var d2 = new Date(b.programme.start * 1000);
			return ((d1 < d2) ? -1 : ((d1 > d2) ? 1 : 0));
		});
	}

	// Get next recommendation.
	$scope.nextRec = function() {
		$scope.recIndex++;

		if ($scope.recIndex >= $scope.recMovies.length) {
			window.alert("Skit i det då!");
		} else {

			var m = $scope.recMovies[$scope.recIndex];
			var i = $scope.movies.indexOf(m) + 1;
			$('#movie-carousel').carousel(i);
		}
	}

	$scope.setDay = function(d) {
		if (d != $scope.day) {
			$('#movie-carousel').carousel(0);
			$scope.movies = [];
			$scope.day = d;
			$scope.getMovies();
		}
	}

	// Get procentage of movie that has elapsed from now.
	$scope.getMovieProgress = function(movie) {
		var start = new Date(movie.programme.start * 1000);
		var end = new Date(movie.programme.stop * 1000);
		var now = new Date().getTime();

		if (now > end) return 100;
		if (now < start) return 0;

		return Math.round((Math.abs(now - start)/Math.abs(end - start)) * 100);
	}

	$scope.loadTrailer = function (index) {
		// If trailer hasn't been loaded before...
		if ($('#'+index+'-trailer').attr('class').indexOf('lazyYT-video-loaded') == -1) {
			// Trailer window sizes.
			$(window).trigger('resize');

			// Load youtube video.
			$('#'+index+'-trailer').lazyYT();

			// Pause video on modal close.
			$('#' + index + '-trailer-modal').on('hide.bs.modal', function () {
				for (var i = 0; i < $('iframe').length; i++) {
					var iframe = $('iframe')[i].contentWindow;
					iframe.postMessage('{"event":"command","func":"pauseVideo","args":""}','*');
				};
			});
		}
	}

	// Get name of weekday.
	$scope.getDayString = function() {
		var days = ['måndag','tisdag','onsdag','torsdag','fredag','lördag','söndag'];

		var d = new Date();
		d.setDate(d.getDate() + 1);

		return days[d.getDay()];
	}

	// Get HH:MM formatted string representation of time.
	$scope.getTimeString = function(unix_time) {
		var date = new Date(unix_time * 1000);

		var h = date.getHours();
		if (h < 10) h = '0' + h;
		var m = date.getMinutes();
		if (m < 10) m = '0' + m;

		return h + ":" + m;
	}

	// Get YYYY-MM-DD formatted string representation of date.
	$scope.getDateString = function (addDays) {
		var d = new Date();
		d.setDate(d.getDate() + parseInt(addDays));

		var y = d.getFullYear();
		var m = (d.getMonth() + 1);
		if (m < 10) {m = '0' + m; }

		var day = d.getDate();
		if (day < 10) {day = '0' + day; }

		return y + '-' + m + '-' + day;
	}

	$scope.getStars = function (score, type) {
		var rating = Math.round(score/10);
		var full = [];
		var half = [];
		var empty = [];

		if (rating%2==0) {
			full[rating/2 - 1] = undefined;
			empty[(5 - full.length) - 1] = undefined;
		} else {
			full[Math.floor(rating/2) - 1] = undefined;
			empty[(5 - full.length) - 2] = undefined;
			half = [''];
		}

		if (type=='full') {
			return full;
		} else if (type == 'empty') {
			return empty;
		} else if (type == 'half') {
			return half;
		}
	}
}