/*
 * angular-google-picker
 *
 * Interact with the Google API Picker
 * More information about the Google API can be found at https://developers.google.com/picker/
 *
 * (c) 2014 Loic Kartono
 * License: MIT
 */

angular.module('lk-google-picker', [])

.provider('lkGoogleSettings', function () {
  this.apiKey = null;
  this.clientId = null;
  this.scopes = ['https://www.googleapis.com/auth/drive'];
  this.features = ['MULTISELECT_ENABLED'];
  this.views = [
    'DocsView().setIncludeFolders(true)',
    'DocsUploadView().setIncludeFolders(true)'
  ];
  this.locale = 'en';
  this.validMimeTypes = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.kix',
    'application/vnd.google-apps.presentation',
    'application/pdf'
  ];

  /**
   * Provider factory $get method
   * Return Google Picker API settings
   */
  this.$get = ['$window', function ($window) {
    return {
      apiKey: this.apiKey,
      clientId: this.clientId,
      scopes: this.scopes,
      features: this.features,
      views: this.views,
      locale: this.locale,
      origin: this.origin || $window.location.protocol + '//' + $window.location.host,
      validMimeTypes: this.validMimeTypes
    }
  }];

  /**
   * Set the API config params using a hash
   */
  this.configure = function (config) {
    for (var key in config) {
      this[key] = config[key];
    }
  };
})

.directive('lkGooglePicker', ['lkGoogleSettings', function (lkGoogleSettings) {
  return {
    restrict: 'A',
    scope: {
      pickerFiles: '=',
      pickerCallback: '='
    },
    link: function (scope, element, attrs) {
      var accessToken = null;

      /**
       * Load required modules
       */
      function instantiate() {
        gapi.load('auth', {'callback': onApiAuthLoad});
        gapi.load('picker');
      }

      /**
       * For users with multiple google accounts, pass the Google UID
       * to get the proper accessToken [for the right files] every time.
       * borrowed from http://stackoverflow.com/a/13379472/1444541
       */
      function onApiAuthLoad (noImmediate) {
        var settings = {
          'client_id' : lkGoogleSettings.clientId,
          'scope'     : lkGoogleSettings.scopes,
          'user_id'   : attrs.googleId,
          'authuser'  : -1
        };

        if (!noImmediate) {
          settings.immediate = true;
        }

        gapi.auth.authorize(settings, handleAuthResult);
      }

      function handleAuthResult (result) {
        if (result && !result.error) {
          accessToken = result.access_token;
          openDialog();
        }
        else if (result.error === 'immediate_failed') {
          onApiAuthLoad(true);
        }
        else {
          console.error('handleAuthResult error', result);
        }
      }

      /**
       * Everything is good, open the files picker
       */
      function openDialog () {
        var picker = new google.picker.PickerBuilder()
                               .setLocale(lkGoogleSettings.locale)
                               .setOAuthToken(accessToken)
                               .setCallback(pickerResponse)
                               .setOrigin(lkGoogleSettings.origin);

        if (lkGoogleSettings.features.length > 0) {
          angular.forEach(lkGoogleSettings.features, function (feature, key) {
            picker.enableFeature(google.picker.Feature[feature]);
          });
        }

        if (lkGoogleSettings.views.length > 0) {
          angular.forEach(lkGoogleSettings.views, function (view, key) {
            view = eval('new google.picker.' + view);
            picker.addView(view);
          });
        }

        var builtPicker = picker.build();
        if (!builtPicker) {
          console.error('build picker failed', builtPicker);
        }
        builtPicker.setVisible(true);
      }

      /**
       * Checks if file(s) picked are of accepted type.
       */
      var validType = function (data) {
        if (!data.docs || !data.docs.length) {
          return false;
        }
        return data.docs.every(function (doc) {
          return lkGoogleSettings.validMimeTypes.indexOf(doc.mimeType) >= 0;
        });
      };

      /**
       * Callback invoked when interacting with the Picker
       * data: Object returned by the API
       */
      function pickerResponse(data) {
        if (data.action == google.picker.Action.PICKED) {
          if (validType(data)) {
            gapi.client.load('drive', 'v2', function () {
              angular.forEach(data.docs, function (file, index) {
                scope.pickerFiles.push(file);
              });
              scope.pickerCallback(null, scope.pickerFiles);
              scope.$apply();
            });
          } else {
            scope.pickerCallback(new Error('Invalid type for import.'));
            scope.$apply();
          }
        }
      }

      gapi.load('auth');
      gapi.load('picker');

      element.bind('click', function (e) {
        instantiate();
      });
    }
  }
}]);
