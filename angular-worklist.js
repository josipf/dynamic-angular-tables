/*
    PROJECT: CREDIT SUISSE - Swisscard BPMS - Angular-based Worklist widget
    AUTHOR: Josip Filipovic
    COPYRIGHT: Backbase.com 2014
*/

/*global window be gadgets*/
/**
 *
 * @param {Object} jQuery object
 * @param {Object} angular object
 */


define(["lp!angular"], function (angular) {
    "use strict";

    var  widget,
        app = angular.module('app', []);

    app.controller('scWorklistCtrl', ['$scope', '$rootScope', 'sendData', 'getData', '$http', function ($scope, $rootScope, sendData, getData,$http) {

        // Backbase portal widget's preferences retrieval
        $scope.titleVisible =  widget.getPreference("showTitle");
        $scope.counterVisible = widget.getPreference("showCounter");
        $scope.tableTitle = widget.getPreference("tableTitle");
        $scope.error = {};

        // fetch initial endpoint data
        function getWorklist(url) {
            getData.getItem(bd.contextRoot+"/"+url).then(function(data) {
                if (data.result.status === "success") {
                    $scope.cases = data.data.worklist;
                    $scope.headers = getHeaders($scope.cases[0]);

                    addVisible($scope.cases);
                    renderFilters();
                    $scope.activeClass = $scope.headers[0].name;
                    $scope.setInitialSorts($scope.headers[0].name);
                }
                else {
                    $scope.error.status = true;
                    $scope.error.message = "There was an error in processing your sumbission!";
                }
            }, function(error){
                $scope.error.status = true;
                $scope.error.message = error;
            });
        }

        getWorklist(widget.getPreference("pipeUrl"));

        $scope.sortReverse = [];
        $scope.filterOpen = false;
        $scope.currColValues = [];
        $scope.filterTick= [];
        $scope.filterTickNamed= [];
        var colValues = [];

        $scope.setInitialSorts = function(initialSort){
            $scope.sortOrder = initialSort;
        };

        $scope.openHeadFilter = function (headerName,$event) {
            $event.stopPropagation();
            $scope.activeHeadFilter = headerName;
            $scope.filterOpen = !$scope.filterOpen;
        };

        $scope.closeFilters = function (){
            $scope.filterOpen = false;
        };

        // advanced dynamically generated column value filters
        $scope.filterChanged = function () {
            var visible=0;

            angular.forEach($scope.cases, function(val,key){

                for (var i=0; i<=$scope.headers.length-1; i++) {
                    var currHeaderName = $scope.headers[i].name,
                        currFilters = $scope.currColValues[i],
                        result = $.grep(currFilters, function(e){
                        return e.name == $scope.cases[key][currHeaderName];
                    });

                    if (result[0].model === true){
                        $scope.cases[key].visible = 1;
                    }
                    else {
                        $scope.cases[key].visible = 0;
                        break;
                    }
                }
            });

            angular.forEach($scope.cases, function(val,key){
                if ($scope.cases[key].visible) visible++
            });
            $scope.totalVisible = visible;
        };

        // sort capabilites
        $scope.sortBy = function(sort){
            if ($scope.sortOrder === sort) {
                $scope.sortOrder = '-'+sort;
                $scope.sortReverse[sort] = false;
            }
            else {
                $scope.sortOrder = sort;
                $scope.sortReverse[sort] = true;
            }
            $.each($scope.headers, function(key, val ) {
                if (sort == val.name || sort == '-'+val.name) {
                    $scope.activeClass = val.name;
                }
            });
        };

        $scope.openCase = function (id) {
              gadgets.pubsub.publish(widget.getPreference("publishEvent"), id);
        };

        // dynamic generation of headers: object keys to header titles
        $scope.unCamelCase = function (str){
            return str.replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
                .replace(/^./, function(str){
                    return str.toUpperCase();
                });
        };

        // get unique column values
        function getHeaders (obj) {
            return $.map(obj, function(v, i){
                if (i == '$$hashKey') {
                    return undefined;
                }
                return {"name":i}
            });
        }

        function addVisible (array){
            $scope.totalVisible = $scope.cases.length;
            angular.forEach(array, function(val, key){
                array[key].visible = 1;
            });
        }

        // dynamic filter rendering
        function renderFilters(){
            angular.forEach($scope.headers, function(val,key){

                $scope.filterTick[key]= [];
                $scope.currColValues[key] = [];

                angular.forEach($scope.cases, function(valc,keyc){
                    if ($scope.cases[keyc].hasOwnProperty(val.name)){
                        $scope.currColValues[key].push($scope.cases[keyc][val.name]);
                    }
                });

                $scope.currColValues[key] = $.grep($scope.currColValues[key], function(valcc, keycc){
                    return $.inArray(valcc ,$scope.currColValues[key]) === keycc;
                });

                angular.forEach($scope.currColValues[key], function(valin, keyin){
                    $scope.currColValues[key][keyin] = {"name":valin,"model":true};
                });

                colValues[key] = $scope.currColValues[key];
            });
        }

        // inter-widget publish-subscribe communication pattern
        gadgets.pubsub.subscribe(widget.getPreference("subscribeEvent"), function(url) {
            getWorklist(url);
            $scope.$apply();
        });

    }]);

    // angular factories - communication with REST API
    app.factory('sendData', function ($http, $q) {
        return {
            sendItem: function (url, data) {
                var deferred = $q.defer();
                $http.post(url, data).success(function (data) {
                    deferred.resolve(data);
                }).error(function () {
                        deferred.reject("An error occured while sending items.");
                    });
                return deferred.promise;
            }
        }
    });

    app.factory('getData', function ($http, $q) {
        return {
            getItem: function (url, data) {
                var deferred = $q.defer();
                $http.get(url, data).success(function(data) {
                    deferred.resolve(data);
                }).error(function () {
                        deferred.reject("An error occured while fetching items.");
                    });
                return deferred.promise;
            }
        }
    });

    // custom angular filters
    app.filter("toArray", function(){
        return function(obj) {
            var result = [];
            angular.forEach(obj, function(val, key) {
                if (key == '$$hashKey') {
                    return undefined;
                }
                result.push(val);
            });
            return result;
        };
    });

    app.filter('flag', function() {
        return function(input) {
            if (input === true) { return '<i class="glyphicon glyphicon-flag"></i>'}
            else if (input === false) {return '-'}
            else {return input}
        };
    });

    app.filter('visibility', function() {
        return function(caseObj) {
            return caseObj.visible === 1 ? caseObj : undefined;
        };
    });

    // custom angular directive for closing popups after clicking anywhere (event bubbling handling)
    app.directive('clickAnywhere', ['$document', '$parse', function($document, $parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attr, ctrl) {
                var handler = function(event) {
                    if (element.has(event.target).length == 0)
                        scope.$apply($parse(attr['clickOutside'])(scope, {$event: event}));
                };
                $document.on('click', handler);
                scope.$on('$destroy', function() {
                    $document.off('click', handler);
                });
            }
        }
    }]);

    var w = function (widget) {
        this.widget = widget;
        this.$widget = $(widget.body);
    };

    // manual (custom) bootstrapping of angular app
    w.prototype.init = function () {
        widget = this.widget;
        angular.bootstrap(widget.body, ['app']);
        this.$widget.find("div.loading").removeClass('loading');
    };

    // revealing module pattern (require.js)
    return function (widget) {
        var widgetWrapper = new w(widget);
        widgetWrapper.init();
        return widgetWrapper;
    };
});
