#!/usr/bin/env node

const DEBUGGER_PORT = 6000; // Keep in sync with setup.sh

var connect = require('node-firefox-connect');
var installApp = require('node-firefox-install-app');

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

function usage() {
    console.error("Usage: b2g.js command <param1, param2>");
    console.log("Supported commands:");
    console.log("  list");
    console.log("  install path");
    console.log("  stop app_name");
    console.log("  launch app_name");
    console.log("  uninstall app_name");
    console.log("  manifest app_name");
    console.log("  update path app_name");

    process.exit(1);
}

if (!command) {
    usage();
}

switch (command) {
    case "stop":
    case "launch":
    case "install":
    case "uninstall":
    case "manifest":
        if (!arg1) {
            usage();
        }
        break;
    case "update":
        if (!arg1 || !arg2) {
            usage();
        }
        break;
    case "list":
        break;
    default:
        usage();
}

// zip a path content and resolves with the zip path.
function zipApp(appPath) {

    var zipPath = new temporary.File().path;

    return new Promise(function (resolve, reject) {
        zipFolder(appPath, zipPath, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(zipPath);
            }
        });
    });
}

// Convenience function that returns a promise that resolves
// to [apps_manager, installed_apps, client]
function get_apps() {
    return new Promise((resolve, reject) => {
        connect(DEBUGGER_PORT)
            .then((client) => {
                client.getWebapps((err, manager) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    manager.getInstalledApps(function (err, apps) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve([manager, apps, client]);
                        }
                    });
                });
            },
            reject);
    });
}

// Returns the app manifest for the app that matches txt either
// in its name, or manifest url.
function app_manifest_for(apps, txt) {
    let lower = txt.toLowerCase();
    for (app of apps) {
        if (app.name.toLowerCase().indexOf(lower) != -1) {
            return app.manifestURL;
        }
        if (app.manifestURL.toLowerCase().indexOf(lower) != -1) {
            return app.manifestURL;
        }
    }
    return null;
}

// Returns the app id for the app that matches txt either
// in its name, or manifest url.
function app_id_for(apps, txt) {
    let lower = txt.toLowerCase();
    for (app of apps) {
        if (app.name.toLowerCase().indexOf(lower) != -1) {
            return app.id;
        }
        if (app.manifestURL.toLowerCase().indexOf(lower) != -1) {
            return app.id;
        }
    }
    return null;
}

class AppManager {
    constructor(manager, apps, client) {
        this.manager = manager;
        this.apps = apps;
        this.client = client;
    }

    stop(name) {
        let manager = this.manager;
        let apps = this.apps;
        return new Promise((resolve, reject) => {
            let manifest_url = app_manifest_for(apps, name);
            if (!manifest_url) {
                reject();
            } else {
                manager.close(manifest_url, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            }
        });
    }

    launch(name) {
        let manager = this.manager;
        let apps = this.apps;
        return new Promise((resolve, reject) => {
            let manifest_url = app_manifest_for(apps, name);
            if (!manifest_url) {
                reject();
            } else {
                manager.launch(manifest_url, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            }
        });
    }

    uninstall(name) {
        let manager = this.manager;
        let apps = this.apps;
        return new Promise((resolve, reject) => {
            let manifest_url = app_manifest_for(apps, name);
            if (!manifest_url) {
                reject();
            } else {
                manager.uninstall(manifest_url, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            }
        });
    }

    install(path, id) {
        return installApp({
            appPath: path,
            client: this.client,
            id: id
        });
    }
}

function end_ok() {
    process.exit();
}

function end_error(err) {
    err && console.error(err);
    process.exit(1);
}

// 'main'
{
    get_apps().then(
        ([manager, apps, client]) => {
            let webapps = new AppManager(manager, apps, client);
            switch (command) {
                case 'stop':
                    webapps.stop(arg1).then(end_ok, end_error);
                    break;
                case 'launch':
                    webapps.launch(arg1).then(end_ok, end_error);
                    break;
                case 'uninstall':
                    webapps.uninstall(arg1).then(end_ok, end_error);
                    break;
                case 'install':
                    webapps.install(arg1).then(end_ok, end_error);
                    break;
                case 'manifest': {
                    let manifest_url = app_manifest_for(apps, arg1);
                    if (manifest_url) {
                        console.log(manifest_url);
                        end_ok();
                    } else {
                        end_error(`No manifest found for "${arg1}"`);
                    }
                }
                    break;
                case 'adbupdate': {
                    let manifest_url = app_manifest_for(apps, arg1);
                    if (manifest_url) {
                        let path = manifest_url.replace("app://", "/data/local/webapps/")
                            .replace("manifest.webapp", "application.zip");
                        console.log(`adb push application.zip ${path}`);
                        end_ok();
                    } else {
                        end_error(`No manifest found for "${arg1}"`);
                    }
                }
                case 'update': {
                    let app_id = app_id_for(apps, arg2);
                    if (app_id) {
                        webapps.install(arg1, app_id).then(end_ok, end_error);
                    } else {
                        end_error(`No app id found for "${arg2}"`);
                    }
                    break;
                }
                case 'list': {
                    for (app of apps) {
                        console.log(`${app.name} ${app.localId} ${app.manifestURL}`);
                    }
                    end_ok();
                    break;
                }
                default:
                    end_error(`Unknown command: ${command}`);
            }

        },
        end_error);
}