![Logo](https://cloud.githubusercontent.com/assets/4325587/2675412/53a4b692-c118-11e3-8147-2f7d99355ae5.png)

[![Build Status](https://travis-ci.org/rhapsodyjs/RhapsodyJS.svg?branch=master)](https://travis-ci.org/rhapsodyjs/RhapsodyJS) [![Dependency manager](https://david-dm.org/rhapsodyjs/rhapsodyjs.png)](https://david-dm.org/rhapsodyjs/rhapsodyjs)

RhapsodyJS is a HMVC framework that runs on top of Express 4, it also creates a RESTful API for your models, supports sockets, middleware/policies system, and a lot of other features, give it a try and see with your own eyes!

## Install RhapsodyJS

To install RhapsodyJS, you must run the command:

```sh
    $ npm install rhapsody-cli --global 
```

## New app

To generate a new RhapsodyJS app, you should go to the folder where your app folder will be, and then run:

```sh
    $ rhapsody-cli new APP_NAME
```

Where `APP_NAME` is the name of your app

This will generate the basic structure of your app

Then:

```sh
    $ cd APP_NAME && npm install
    $ rhapsody run
```

And your app will be running in [localhost:4242](http://localhost:4242)

## Documentation

Click here to see [RhapsodyJS documentation](http://rhapsodyjs.github.io/)

## Examples

Click here to see some [example apps](https://github.com/rhapsodyjs/RhapsodyJS-examples)