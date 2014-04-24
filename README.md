# Filmjölk
Filmjölk is a web application for displaying and recommending currently airing movies on swedish television.

It's built with [jQuery](http://jquery.com/), [AngularJS](http://angularjs.org/) and [Bootstrap](http://getbootstrap.com/) on the frontend, and [Node.js](http://nodejs.org/) with [Express](http://expressjs.com/) on the backend.

## Dependencies
Filmjölk uses the following Node.js dependencies:

* **Express** as web framework.

* **[async](https://github.com/caolan/async)** for handling multiple asynchronus API calls on the server side.

* **[imdb-api](https://github.com/worr/node-imdb-api)** for fetching IMDb data.

* **[moviedb](https://github.com/danzajdband/moviedb)** for fetching TMDB data.

* **[tomatoes](https://github.com/skookum/tomatoes)** for fetching RottenTomatoes data.

and the following jQuery plugins:

* **[lazyYT.js](https://plugins.jquery.com/lazyYT/)** for lazy loading of Youtube videos.

Other services used include: [FontAwesome](http://fontawesome.io/), [Bootswatch](http://bootswatch.com/) and [Google Web Fonts](http://www.google.com/fonts/).

## Requirements
In order to get data from [epg.io](http://epg.io), [fanart.tv](http://fanart.tv/), [themoviedb.org](http://www.themoviedb.org/) and [RottenTomatoes](http://www.rottentomatoes.com/) the following files are required:

* **/keys/epgio** containing a valid [epg.io API key](http://epg.io/api)

* **/keys/fanarttv** containing a valid [fanart.tv API key](http://fanart.tv/get-an-api-key/).

* **/keys/tmdb** containing a valid [TMDb API key](http://www.themoviedb.org/documentation/api).

* **/keys/rottentomatoes** containing a valid [Rotten Tomatoes API key](http://developer.rottentomatoes.com/docs).

## How to install and run
Open a terminal and execute the following command to install the Node.js dependencies:

    npm install

Execute this command to start the application:

    node filmjolk [port]
