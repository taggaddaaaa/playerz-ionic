'use strict';

let express = require('express');
let router = express.Router();
let controllerUser = require('../controllers/user');
let passport = require('passport');

router
    .post('/forgotPassword', controllerUser.forgotPassword)
    .post('/resetPassword', controllerUser.resetPassword)
    .post('/changePassword', passport.authenticate('jwt', {
        session: false
    }), controllerUser.changePassword);

module.exports = router;