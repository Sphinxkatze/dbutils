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

function changeApplication(application_){
    application = application_;
}

const controller = {
    changeApplication
}

let client, application;
const { MongoClient } = require('mongodb');
async function connect(user, pw, domain, port, application_ = 'default'){
    const connectionURI = `mongodb+srv://${user}:${pw}@${domain}:${port}/` +
        (application_? `appName=${application_}` : '');

    client = new MongoClient(connectionURI);
    application = application_;
    try {
        await client.connect();
        return true;
    }catch(err){
        console.error(err);
        return false;
    }
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
    const sub_database = await client.db(application).collection(location[0]);
    if (!sub_database)
        return;

    const query = {};
    query[location[1]] = (location[2] && location[2] !== '*')? location[2] : { $exists: true };

    const options = {projection: {_id: 0}};
    let usesWildcard = false;
    if (key === '*')
        options.projection['$'] = 1;
    else {
        if (key.includes('*')){
            key = key.replaceFirst('*', '.$');
            usesWildcard = true;
        }

        options.projection[key] = 1;
    }

    const result = await sub_database.findOne(query, options);
    return (key !== '*')? (!usesWildcard? result[key] : result[key.replace('.$', '')]) : result;
}

function createTTL_Index(database){
    const indexes = sub_database.getIndexes();
    for (index of indexes){
        if (index.name = '_ttlIDX')
            break;
    }

    sub_database.createIndex({ "expiresAt": 1 },
        {
            expireAfterSeconds: 1,
            name: '_ttlIDX'
        }
    );

}

async function newEntry(location, key, value, options){
    const sub_database = await client.db(application ?? 'default').collection(location[0]);
    let query = {};

    createTTL_Index(sub_database);
    if (!(!location[2] || location[2] === '*'))
        query[location[1]] = location[2];
    else {
        const value_ = await read(location, location[2]);
        query[location[1]] = value_;
    }

    const content = {$set: {}};
    content.$set[key] = value;
    if (options.expiration?.enabled){
        content.$set.expiresAt = new Date(Date.now() +
                options.expiration.hours *1000*60 +
                options.expiration.min*1000);
    }

    const result = await sub_database.updateOne(query, content, (!location[3])? {upsert: true} : {});
    console.log(result);
}

async function custom(instruction){
    return await client.db(application).command(instruction);
}

async function close(){
    await client.close();
}



module.exports = {
    connect,
    access,
    read,
    newEntry,
    custom,
    close,

    controller

}