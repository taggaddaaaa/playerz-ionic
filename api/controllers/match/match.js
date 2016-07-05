//controller match
'use strict';

let getToken = require('../token');
let Utils = require('../../utils');
let jwt = require('jwt-simple');
let config = require('../../config/database');
let Match = require('../../models/match').modelMatch;
let Coach = require('../../models/coach').modelCoach;
let Player = require('../../models/player').modelPlayer;
let Statistic = require('../../models/statistics').modelStatistic;
let real_time = require('../../real_time');
let async = require('async');
let Football = require('../../sports/football');
let privateMatch = require('./private');

exports.addMatch = function(req, res) {
    let token = getToken(req.headers);

    let against_team = req.body.against_team;
    let place = req.body.place;
    let type = req.body.type;
    let date = req.body.date;


    if (token) {
        let decoded = jwt.decode(token, config.secret);

        let idCoach = decoded._id;

        if (!against_team || !place || !type || !date) {
            return res.status(403).json({
                success: false,
                msg: "Certains champs n'ont pas été saisies"
            });
        }

        let newMatch = new Match({
            against_team: against_team,
            place: place,
            type: type,
            date: new Date(date),
            belongs_to: idCoach,
            status: 'comeup'

        });

        newMatch.save(function(err, match) {
            if (err) {
                return res.json({
                    success: false,
                    msg: 'Error save match'
                });
            }
        });

        Coach.findById(decoded._id, function(err, coach) {
            if (err)
                throw err;

            console.log(coach.team.matchs);
            coach.team.matchs.push(newMatch);
            coach.save();
            res.json({
                success: true,
                match: coach.team.matchs
            });

        });


    } else {
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }

};

exports.getMatchs = function(req, res) {
    let token = getToken(req.headers);

    if (token) {
        let decoded = jwt.decode(token, config.secret);

        Coach.findById(decoded._id, function(err, coach) {
            if (err)
                throw err;

            res.json({
                success: true,
                matchs: coach.team.matchs
            });
        });
    } else {
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }
};

exports.getMatchById = function(req, res) {
    let token = getToken(req.headers);

    if (token) {
        let decoded = jwt.decode(token, config.secret);

        Coach.findById(decoded._id, function(err, coach) {
            if (err)
                throw err;

            let match = coach.team.matchs.id(req.params.id);
            res.json({
                success: true,
                match: match
            });
        });
    } else {
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }
};

exports.removeMatch = function(req, res) {
    let token = getToken(req.headers);

    if (token) {
        let decoded = jwt.decode(token, config.secret);


        Coach.findById(decoded._id, function(err, coach) {
            if (err)
                throw err;

            Match.remove({
                _id: req.body.id
            }, function(err, ok) {
                console.log(err, ok);
            });

            coach.team.matchs.id(req.body.id).remove();
            coach.save();
            res.json({
                success: true,
                match: coach.team.matchs
            });
        });

    } else {
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }
};

exports.addFormation = function(req, res) {
    let token = getToken(req.headers);

    if (token) {
        let decoded = jwt.decode(token, config.secret);

        Coach.findById(decoded._id, function(err, coach) {
            if (err)
                throw err;

            let match = coach.team.matchs.id(req.body.id);

            match.formation = req.body.formation;
            coach.save();
            console.log(match);

            res.json({
                success: true,
                match: match
            });
        });

    } else {
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }
};

exports.getTactique = function(req, res) {
    let token = getToken(req.headers);

    if (token) {
        let tactique = req.query.tactique;

        if (tactique === '4-4-2') {
            res.json({
                success: true,
                tactique: Football.QQDEUX_POST
            });
        } else if (tactique === '4-3-3') {
            res.json({
                success: true,
                tactique: Football.QTTROIS_POST
            });
        } else {
            res.json({
                success: false
            });
        }
    } else {
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }
};

exports.removePlayerSelected = function(req, res) {
    let token = getToken(req.headers);

    if (token) {
        let decoded = jwt.decode(token, config.secret);
        let player_id = req.body.player_id;
        let match_id = req.body.match_id;

        Player.findById(player_id, function(err, player) {
            if (err)
                res.status(404).json({
                    error: err
                });

            Coach.findById(decoded._id, function(err, coach) {
                if (err) {
                    res.status(404).json({
                        error: err
                    });
                }

                let playersSelected = coach.team.matchs
                    .id(match_id)
                    .playerSelected;

                let findPlayer = playersSelected.indexOf(player_id);

                if (findPlayer >= 0) {
                    real_time.removePlayerSelected_firebase(player, match_id, decoded._id);
                    playersSelected.splice(findPlayer, 1);

                } else {
                    return res.status(202).json({
                        msg: 'player not exists'
                    });
                }


                coach.save(function(err) {
                    if (err)
                        res.status(404).json({
                            error: err
                        });
                    res.status(202).json({
                        player: player,
                        playerSelected: playersSelected,
                        msg: 'player removed'
                    });
                });

            });

        });

    } else {
        return res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }
};

exports.addPlayerSelected = function(req, res) {
    let token = getToken(req.headers);

    if (token) {
        let decoded = jwt.decode(token, config.secret);
        let player_id = req.body.player_id;
        let match_id = req.body.match_id;
        let position = req.body.position;


        async.waterfall([
            (cb) => {

                Coach.findById(decoded._id, (err, coach) => {
                    if (err)
                        throw err;

                    let playerSelected = coach.team.matchs.id(match_id).playerSelected;
                    let formation = coach.team.matchs.id(match_id).formation;
                    let findPlayer = playerSelected.indexOf(player_id); // return -1 if player not exist else return value >= 0
                    let numberPlayerSelected = playerSelected.length;

                    cb(null, playerSelected, formation, findPlayer, numberPlayerSelected, coach);

                });
            },

            (playerSelected, formation, findPlayer, numberPlayerSelected, coach, cb) => {

                Player.find({
                    _id: {
                        "$in": playerSelected
                    }
                }, (err, playerPosition) => {
                    console.log(playerPosition);
                    Player.findById(player_id, (err, mainPlayer) => {

                        for (let player of playerPosition) {

                            // check if there are 11 players on the pitch
                            if ((numberPlayerSelected >= 11) && (findPlayer < 0) && (position !== 'REM')) {
                                return res.status(201).json({
                                    success: false,
                                    msg: 'Vous avez dejà 11 joueurs sur le terrain'
                                });
                            }
                            // check if two players are the same position
                            if (player.position === position && position !== 'REM' && player._id.toString() !== player_id.toString()) {
                                return res.status(201).json({
                                    success: false,
                                    msg: `Attention
                                    ${player.first_name} ${player.last_name} et ${mainPlayer.first_name} ${mainPlayer.last_name}
                                    ne peuvent pas avoir le même poste`
                                });
                            }
                        }
                        cb(null, playerSelected, formation, findPlayer, numberPlayerSelected, coach);
                    });
                });
            },

            (playerSelected, formation, findPlayer, numberPlayerSelected, coach, cb) => {

                Player.findById(player_id, (err, player) => {
                    if (err)
                        throw err;

                    //change position of player even if he is already added
                    player.position = position;

                    real_time.updateStatistic_firebase(player, match_id, decoded._id, {
                        first_name: player.first_name,
                        last_name: player.last_name,
                        id: player._id,
                        position: position,
                    });

                    //check if user already exist
                    if (findPlayer === -1) {

                        // if array stat is empty add stat
                        if (player.statistics.length === 0) {
                            //add stastistic to player
                            privateMatch._addStatisticsToPlayer(player, match_id);

                        } else {

                            // if array stat is not empty check if stat with
                            // match_id already exist
                            let statExist = false;
                            for (let i = 0, x = player.statistics.length; i < x; i++) {
                                if (player.statistics[i].match_id.toString() === match_id.toString()) {
                                    statExist = true;

                                }
                            }

                            if (!statExist) {
                                //add stastistic to player
                                //console.log('stat stat');
                                privateMatch._addStatisticsToPlayer(player, match_id);
                            }
                        }

                        if (formation === '4-4-2') {
                            /************* add verif position ***********************/

                            real_time.addPlayerSelected_firebase(player, match_id, decoded._id);
                            playerSelected.push(player);

                            player.save();
                            coach.save();
                            console.log(player);
                            return res.status(201).json({
                                success: true,
                                player: player,
                                playersSelected: playerSelected,
                                msg: 'Joueur ajouté'
                            });
                        }
                    } else {
                        player.save();
                        return res.status(201).json({
                            success: false,
                            msg: 'Ce joueur a déjà été ajouté',
                            playersSelected: playerSelected
                        });
                    }


                });

            }
        ]);
    } else {
        res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });

    }
};


exports.getPlayerSelected = function(req, res) {

    let token = getToken(req.headers);

    if (token) {
        let decoded = jwt.decode(token, config.secret);

        Coach.findById(decoded._id)
            .populate('team.matchs.playerSelected')
            .exec(function(err, coach) {
                if (err)
                    res.status(404).json({
                        error: err
                    });

                let playerSelected = coach.team.matchs.id(req.query.match_id).playerSelected;

                res.status(201).json({
                    success: true,
                    playerSelected: playerSelected
                });

            });

    } else {
        res.status(403).send({
            success: false,
            msg: 'No token provided.'
        });
    }
};


exports.findMatchFinished = function(req, res) {
    privateMatch._findMatch('finished', req, res);
};

exports.findMatchComeUp = function(req, res) {
    privateMatch._findMatch('comeup', req, res);
};

exports.defaultPosition = (req, res) => {
    let token = getToken(req.headers);

    let idMatch = req.body.match_id;
    let countGD = 0;
    let GD = false,
        DFD = false,
        DFG = false,
        ARG = false,
        ARD = false,
        MCD = false,
        MCG = false,
        MD = false,
        MG = false,
        ATG = false,
        ATD = false;

    if (token) {
        let decoded = jwt.decode(token, config.secret);

        let idCoach = decoded._id;

        async.waterfall([
            (done) => {
                Coach.findById(idCoach, (err, coach) => {
                    if (err)
                        throw err;

                    let team = coach.team;
                    let match = team.matchs.id(idMatch);
                    let players = team.players;
                    let playersSelected = match.playerSelected;

                    done(null, match, players, playersSelected, coach);
                });
            },

            (match, players, playersSelected, coach, done) => {
                let maxPlayer = 0;
                let countGD = 0;
                Player.find({
                        _id: {
                            "$in": players
                        }
                    },
                    (err, players) => {

                        if (coach.sport === Football.FOOTBALL) {

                            if (match.formation === Football.QQDEUX) {

                                while (maxPlayer < 11) {

                                    for (let player of players) {

                                        // placement du gardien
                                        if (player.favourite_position === Football.GD && GD === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'GD', idCoach, playersSelected);
                                            GD = true;
                                            maxPlayer++;
                                            continue;

                                        }

                                        if (player.favourite_position === Football.DEF && DFG === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'DFG', idCoach, playersSelected);
                                            DFG = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (player.favourite_position === Football.DEF && DFD === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'DFD', idCoach, playersSelected);
                                            DFD = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (player.favourite_position === Football.AR && ARG === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'ARG', idCoach, playersSelected);
                                            ARG = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (player.favourite_position === Football.AR && ARD === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'ARD', idCoach, playersSelected);
                                            ARD = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (player.favourite_position === Football.MD && MCD === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'MCD', idCoach, playersSelected);
                                            MCD = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (player.favourite_position === Football.MD && MCG === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'MCG', idCoach, playersSelected);
                                            MCG = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if ((player.favourite_position === Football.MO || player.favourite_position === Football.AI) && MD === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'MD', idCoach, playersSelected);
                                            MD = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if ((player.favourite_position === Football.MO || player.favourite_position === Football.AI) && MG === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'MG', idCoach, playersSelected);
                                            MG = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (player.favourite_position === Football.AV && ATG === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'ATG', idCoach, playersSelected);
                                            ATG = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (player.favourite_position === Football.AV && ATD === false) {
                                            privateMatch._defaultPosition(player, idMatch, 'ATD', idCoach, playersSelected);
                                            ATD = true;
                                            maxPlayer++;
                                            continue;
                                        }

                                        if (maxPlayer < 14) {

                                            privateMatch._defaultPosition(player, idMatch, 'REM', idCoach, playersSelected);
                                            maxPlayer++;
                                            continue;
                                        }
                                    } //for
                                    console.log(maxPlayer);
                                } //while
                            }
                        }
                        coach.save();
                        res.json({
                            msg: 'OK'
                        })
                    });
            }
        ]);
    } else {
        return res.status(403).json({
            success: false,
            msg: 'No token provided.'
        });
    }
};


exports.switchPosition = (req, res) => {

    let player_id_one = req.body.player_id_one;
    let player_id_two = req.body.player_id_two;
    let match_id = req.body.match_id;
    let token = getToken(req.headers);
    //  console.log(player_id_one, player_id_two);
    if (token) {
        let decoded = jwt.decode(token, config.secret);

        let idCoach = decoded._id;

        async.waterfall([
            (cb) => {
                Player.findById(player_id_one, (err, fstPlayer) => {
                    if (err)
                        throw err;

                    //  console.log(fstPlayer);
                    let fstPosition = fstPlayer.position;
                    cb(null, fstPlayer, fstPosition);
                });
            },

            (fstPlayer, fstPosition, cb) => {
                Player.findById(player_id_two, (err, sndPlayer) => {
                    if (err)
                        throw err;

                    //  console.log(sndPlayer);
                    let sndPosition = sndPlayer.position;

                    fstPlayer.position = sndPosition;
                    fstPlayer.save();

                    sndPlayer.position = fstPosition;
                    sndPlayer.save();

                    cb(null, fstPlayer, sndPlayer);

                });
            },

            (fstPlayer, sndPlayer, cb) => {

                let fstPlayerName = `${fstPlayer.first_name} ${fstPlayer.last_name}`;
                let sndPlayerName = `${sndPlayer.first_name} ${sndPlayer.last_name}`;

                real_time.switchPosition_firebase(player_id_one, player_id_two, match_id, idCoach);

                return res.status(200).json({
                    success: true,
                    msg: `${fstPlayerName} et ${sndPlayerName} ont changé de position`
                });

            }

        ])

    } else {
        return res.status(403).json({
            success: false,
            msg: 'No token provided.'
        });
    }

};

exports.getPlayerNoSelected = (req, res) => {

    let match_id = req.query.match_id;
    let token = getToken(req.headers);

    if (token) {

        let decoded = jwt.decode(token, config.secret);
        let idCoach = decoded._id;

        async.waterfall([
            (cb) => {
                Coach.findById(idCoach, (err, coach) => {

                    if (err)
                        throw err;

                    let team = coach.team;
                    let players = team.players;
                    let match = team.matchs.id(match_id);
                    let playersSelected = match.playerSelected;
                    let playersNoSelected = Utils.diffArray(players, playersSelected);

                    cb(null, playersNoSelected, coach, match);
                });
            },

            (playersNoSelected, coach, match, cb) => {
                //  console.log(playersNoSelected);
                Player.find({
                    _id: {
                        "$in": playersNoSelected
                    }
                }, (err, players) => {
                    let matchPlayerNoSelected = match.playerNoSelected;
                    
                    if (err)
                        throw err;

                    for (let player of players) {

                        if (matchPlayerNoSelected.indexOf(player._id) < 0) {
                            matchPlayerNoSelected.push(player);
                        }
                        real_time.playersNoSelected_firebase(match_id, idCoach, player);
                    }

                    coach.save();

                    return res.status(202).json({
                        success: true,
                        players: match.playerNoSelected
                    });
                });
            }
        ])

    } else {
        return res.status(403).json({
            success: false,
            msg: 'No token provided.'
        });
    }
}
