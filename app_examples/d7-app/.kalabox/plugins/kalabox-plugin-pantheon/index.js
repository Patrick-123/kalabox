'use strict';

var fs = require('fs');
var path = require('path');
var stream = require('stream');
var util = require('util');
var _ = require('lodash');
var vasync = require('vasync');

module.exports = function(plugin, manager, app) {

  /**
   * Run and remove an image.
   *
   * @param cmd Array of drush command args
   * @param callback optional callback that is called when process is complete.
   **/
  var runRmDrush = function(cmd, callback) {
    cmd.unshift('@dev');
    cmd.unshift('--include=/src/.kalabox/config/drush/switchboard');
    cmd.unshift('--json');
    cmd.unshift('--verbose');
    cmd.unshift('--debug');

    var stream = require('stream');
    var swstream = new stream.Writable();
    swstream._write = function (chunk, encoding, done) {
      console.log(chunk.toString());
      process.exit(1);
      var resp = JSON.parse(chunk.toString());
      callback(resp);
      done();
    };

    swstream = process.stdout;

    app.docker.run(
      'kalabox/drush',
      cmd,
      swstream,
      {
        Env: ['APPNAME=' +  app.appname, 'APPDOMAIN=' +  app.appdomain],
        Volumes: { '/src': {} }
      },
      {
        Binds: [app.path + ':/src:rw']
      },
      function (err, data, container) {
        if (err) {
          throw err;
        }

        app.manager.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  };

  // Login to pantheon.
  app.manager.registerTask('pantheon.login', function(){
    var args = process.argv.slice(3);

    args.unshift('pantheon');
    args.unshift('sw-auth-login');

    if (!args[2]) {
      if (!plugin['email']) {
        console.log('Missing email');
        return;
      }
      args.push(plugin.email);
    }

    if (!args[3]) {
      if (!plugin['password']) {
        console.log('Missing password');
        return;
      }
      args.push(plugin.password);
    }

    runRmDrush(args, function(data) {
      console.log(data);
    });
  });

  // Login to pantheon.
  app.manager.registerTask('pantheon.list', function(){
    var args = process.argv.slice(3);
    args.unshift('pantheon');
    args.unshift('sw-site-list');

    runRmDrush(args, function(data) {
      var i = 1;
      for (var x in data) {
        console.log(' ' + i + '.', data[x].name);
        i++;
      }
    });
  });

  // Get site info
  app.manager.registerTask('pantheon.info', function(){
    var args = process.argv.slice(3);

    var cmd = ['sw-site-info', 'pantheon'];

    if (!args[2]) {
      if (!plugin['sitename']) {
        console.log('Missing site');
        return;
      }
      cmd.push(plugin.sitename);
    }

    runRmDrush(cmd, function(data) {
      console.log(data);
    });
  });

  // Get environment info
  app.manager.registerTask('pantheon.envs', function(){
    var cmd = ['sw-site-env-list', 'pantheon']

    if (!plugin['sitename']) {
      console.log('Missing site');
      return;
    }
    cmd.push(plugin.sitename);

    runRmDrush(cmd, function(data) {
      console.log(data);
    });
  });

  // Backup environment
  app.manager.registerTask('pantheon.backup', function() {
    var args = process.argv.slice(3);

    if (!plugin['sitename']) {
      console.log('Missing site');
      return;
    }

    var cmd = ['sw-site-env-backup-dl', 'pantheon', plugin.sitename];

    var targetEnv = 'dev';
    if (args[2]) {
      targetEnv = args[2];
    }

    cmd.push(targetEnv);
    cmd.push('db');
    cmd.push('/src/.kalabox/backups');

    runRmDrush(cmd, function(data) {
      console.log(data);
    });
  });

  app.manager.registerTask('pantheon.init', function() {
    if (!plugin['sitename']) {
      console.log('Missing site');
      return;
    }

    var cmd = [
      'sw-project-create',
      app.name,
      '--site_id=4',
      '--strict=0',
      '--provider_name=pantheon',
      '--provider_site_name=' + plugin.sitename,
      '--code_path=/src/public',
      '--files_path=' + '/src/files',
      '--database_host=db.' + app.appdomain,
      '--database_port=3306',
      '--database_username=kalabox',
      '--database_password=',
      '--database_name=kalabox',
      '--hostname=' + app.appdomain,
      '--username=' + plugin.email
    ];

    runRmDrush(cmd, function(data) {
      console.log(data);
    });
  });

  app.manager.registerTask('pantheon.clone', function() {
    var cmd = [
      'sw-project-vcs-clone',
      app.name
    ];

    runRmDrush(cmd, function(data) {
      console.log(data);
    });
  });

  app.manager.registerTask('pantheon.db', function() {
    var cmd = [
      'sw-project-db-import',
      app.name,
      '/src/.kalabox/backups/calduct_dev_2014-11-06T17-00-00_UTC_database.sql.gz'
    ];

    runRmDrush(cmd, function(data) {
      console.log(data);
    });
  });

  app.manager.registerTask('pantheon.files', function() {
    var args = process.argv.slice(3);
    
    var cmd = [
      'sw-project-files-rsync',
      app.name
    ];

    var targetEnv = 'dev';
    if (args[2]) {
      targetEnv = args[2];
    }

    cmd.push(targetEnv);
    cmd.push('down');

    runRmDrush(cmd, function(data) {
      console.log(data);
    });
  });

  app.on('post-start', function() {
    var cmd = ['chmod', '600', '/src/.kalabox/config/ssh/config'];

    console.log(cmd);

    app.docker.run(
      'kalabox/debian',
      cmd,
      process.stdout,
      {
        Env: ['APPNAME=' +  app.appname, 'APPDOMAIN=' +  app.appdomain],
        Volumes: { '/src': {} }
      },
      {
        Binds: [app.path + ':/src:rw']
      },
      function (err, data, container) {
        if (err) {
          throw err;
        }

        app.manager.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  });

};
