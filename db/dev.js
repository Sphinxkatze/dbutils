/*
    dbutils - a library for an universal database api
    Copyright (C) 2025  SphinxKatze

    This library is free software; you can redistribute it and/or
    modify it under the terms of the GNU Lesser General Public
    License version as published by the Free Software Foundation; version 2.1.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public
    License along with this library; if not, write to the Free Software
    Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301
    USA
*/

let dbPath, application;
function init(path){
    dbPath = path;

    remove_TTL();
    module.exports.init = undefined;
}
function changePath(path){
    dbPath = path;
}

function changeApplication(application_){
    application = application_;
}

const controller = {
    setPath: changePath,
    changeApplication
}

const fs = require('node:fs');
function updateCache(application_= application, fullOutput){
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const cache = JSON.parse(data);
        if (!cache[application_])
            cache[application_] = {};

        return !fullOutput? cache[application_] : cache;

    } catch (err) {
        console.error(err);
        return {};
    }
}


async function connect(user, pw, domain, port, application_ = 'default'){
    application = application_;
    try {
        if (!fs.existsSync(dbPath)){
            await fs.promises.mkdir(path.dirname(dbPath), {recursive: true});
            fs.writeFileSync(dbPath, '{}', { flag: 'w+' });
        }
            //file written successfully

        return true;
    } catch (err) {
        console.error(err);
    }

    return false;
}

function access(){
    if (arguments.length > 1){
        //args[2] nullable
        return [arguments[0].toString(), arguments[1].toString(), arguments[2]?.toString(), arguments[3]];
    }else {
        return arguments[0].toString();
    }
}

async function read(location, key){
    const cache = updateCache();

    const sub_database = cache[location[0]];
    if (!sub_database)
        return;

    for (obj of sub_database){
        if (obj[location[1]] && (!location[2] || location[2] === '*' ||
                obj[location[1]] === location[2]))
            return obj[key];
    }
}

const ttlIdx = [];
async function remove_TTL(){
    if (ttlIdx.length == 0)
        return;

    const removeCandidates = [], running = false;
    const removing_Agent = async function(){
        if (running)
            return;

        running = true;
        for (idx=0; idx < removeCandidates.length; idx++){
            const { path, application } = removeCandidates[idx];
            const cache_ = updateCache(application, true), cache = cache_[application];

            for (objIdx_ of cache){
                if (path === objIdx_._id)
                    cache[idx] = undefined;
            }
            removeCandidates[idx] = undefined;
            try {
                fs.writeFileSync(dbPath, JSON.stringify(cache_));
                // file written successfully
            } catch (err) {
                console.error("Updating devCache throws Error: ", err);
            }
        }


        removeCandidates = removeCandidates.filter((obj)=> obj);
        running = false;
    }

    while(ttlIdx.length > 0){
        for (objIdx of ttlIdx){
            if (objIdx.time < new Date()){
                removeCandidates.push({path: objIdx.path, application: objIdx.application});

                removing_Agent();
            }
        }

        const delay = function(sec){
            return new Promise((res)=> {
                setTimeout(res, sec*1000);
            });
        };
        await delay(5);
    }
}

async function newEntry(location, key, value, options){
    const cache = updateCache();

    let sub_database = cache[location[0]];
    if (!sub_database)
        sub_database = [];

    let hit, found = false, success = true, createdNew = false, error;
    for (obj of sub_database){
        if (obj[location[1]] && (!location[2] || location[2] === '*' ||
                obj[location[1]] === location[2])){
            hit = obj;
            found = true;
            break;
        }

    }

    if (!hit){
        //forceExisting
        if (location[3]){
            success = false;
            error = "NoUpsertError: Trying to update value, but value didn\'t already exist!";

        } else {
            const new_hit = {_id: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)};
            sub_database.push(new_hit);

            createdNew = true;
            hit = new_hit;
        }
    }

    if (options?.expiration?.enabled){
        ttlIdx.push({ application: application, path: hit._id, time: new Date(Date.now() +
              options.expiration.hours *1000*60 +
              options.expiration.min*1000) });

        remove_TTL();
    }

    if (success)
        hit[key] = value;

    try {
        const cache_new = updateCache(application, true);
        cache_new[application][location[0]] = sub_database;

        fs.writeFileSync(dbPath, JSON.stringify(cache_new));
        // file written successfully
    } catch (err) {
        console.error("Updating devCache throws Error: ", err);
        error = "Updating devCache throws Error: " + err;
        success = false;
    }

    return {
        found,
        success,

        error,
        createdNew
    };
}

async function custom(instruction){
    return {obj: updateCache(undefined, true), error: 'Unsupported Method'};
}

async function close(){
    //do nothing
}



module.exports = {
    init,
    connect,
    access,
    read,
    newEntry,
    custom,
    close,

    controller

}
