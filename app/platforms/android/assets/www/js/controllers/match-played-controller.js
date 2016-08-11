'use strict'

angular.module('starter.controller.match-played', [])
    .controller('MatchPlayedCtrl', function(TeamService, MatchService, $scope, StorageService, $state) {
        let self = this;

        //force to display back button
        $scope.$on('$ionicView.beforeEnter', function(event, viewData) {
            viewData.enableBack = true;
        });

        self.saveMatchID = function(match_id) {
            StorageService.addStorageMatchId(match_id);

            $state.go('stat-end-match', {matchId: match_id});
        };

        self.getMatchFinished = function() {
            MatchService.getMatchFinished()
                .success(function(data) {
                    console.log(data);
                    self.matchs = data.matchs;
                })
                .error(function(data) {
                    console.log(data);
                });
        };

        self.removeMatch = function(id) {
            MatchService.removeMatch(id)
                .success(function(data) {
                    console.log(data);
                    self.getMatchFinished();
                })
                .error(function(data) {
                    console.log(data);
                });
        };

        // self.scale = (data) => {
        //     let x = d3.scaleLinear()
        //         .domain([0, d3.max(self.ball)])
        //         .range([0, 80]);
        //
        //     return x(data);
        //
        //
        // }

        self.getGlobalStatisticsMatch = () => {
            MatchService.getGlobalStatisticsMatch()
                .success(function(data) {
                    console.log(data);
                    self.statisticsGlobal = data.statisticsGlobal;
                    self.nbrMatchFinished = data.nbrMatchFinished;
                    self.ball = [self.statisticsGlobal.totalBallLost, self.statisticsGlobal.totalBallPlayed];
                    //self.ballChart();
                })
                .error(function(data) {
                    console.log(data);
                });
        };

        self.getNameTeam = function() {
            TeamService.nameTeam()
                .success(function(data) {
                    console.log(data);
                    self.nameTeam = data.nameTeam;
                })
                .error(function(data) {
                    console.log(data);
                });
        };

        self.getBillingName = function(match) {
            if (match.place === 'Domicile') {
                self.billingName = `${self.nameTeam} <br /> - <br /> ${match.against_team}`;
            } else {
                self.billingName = `${match.against_team} <br /> - <br /> ${self.nameTeam}`;
            }
            return self.billingName;
        };

        self.getNameTeam();


        self.getMatchFinished();
        self.getGlobalStatisticsMatch();


    });
