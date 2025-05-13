## dbutils
### Can databases be used without care of the type?
It certainly is with this library, which combines
databases with the own easy to understand api
without the database type to matter.

### Supported types of databases:
- dev (temporary development database)
- mongodb

Do you think, an important type of database is missing, or you
want to add your code to support a database type?
<br>Make an Issue or Pull Request!

### Usage
Pretty simple. First create the database objects;
then use the following different operations:
- [connect(user, pw, DB_URL, port, [application])](#connectuser-pw-domain-port-application)
- [access (database/[key, value], [forceExisting])](#accessdatabasekey-value-forceexisting)
- [newEntry(obj, key, value, [options])](#newentryobj-key-value-options)
- [read(obj, key)](#readobj-key)
- [custom(instruction)](#custominstruction)
- [close()](#close)

Below is an Example:
```js
//Prepare & connect to database
const db = require('dbutils')(*type*, [*useDev*, *devStoragePath*]);
await db.connect('testUser', '123', 'example.com', 1234, 'veryImportantMicroservice');

//Change settings for database
db.controller.setPath("/tmp/application/.devDB")
db.controller.changeApplication("anotherImportantData");

//Write data
const subsetOfData = db.access('testdata');
const firstEntry = db.access(subsetOfData, 'foo');
await db.newEntry(firstEntry, 'foo', 'bar', {expiration: {enabled: true, min: 10}});

//Read data
const value = await db.read(firstEntry, 'foo');
console.log(value);

//Close connection
db.close();
```


### Documentation
#### connect(user, pw, domain, port, [application])
This method allows the initial connection establishment to the database.
<br>The method will return true on successful connection establishment.

The optional parameter 'application' can be used to define sub-databases in an application.
An example usage could be separated sub-databases for different microservices

#### access(database/[key, value], [forceExisting])
This method is used to access:
- a sub-database (already defined sub-databases in ['connect()'](#connectuser-pw-db_url-port-application),
would create sub-databases in sub-database; useful for splitting of different types of data)
- a data pair, defined by a key and a value, so you can modify or read it
using later methods

> Notice: using the second use case, by default it will create a new
> entry, if previous entries, matching the data pair, does not exist

#### newEntry(obj, key, value, [options])
> Using ``await`` can be useful, if you depend on the data being written
> for the logic below

This method is used to write a new or update an existing data pair,
defined by a key and a value, to the database object.

Option valid properties are currently:

- expiration.enabled: Which enables the TTL based removal of documents.
expiration.hours & expiration.min can be used to define the time from now until the event

<br>
Returns:

- found - whether it found any matching data
- success - whether it was successful
- error - message containing the error
- createdNew - whether a new pair was created

>Notice: you can only write to objects, once an object was selected using 'access()' above.

#### read(obj, key)
> Using ``await`` can be useful, if you depend on the data being read
> for the logic below

This method is used to read an existing data pair,
searched by the key from the database object.

>Notice: you can only read from objects, once an object was selected using 'access()' above.

#### custom(instruction)
>!!Warning: Using this kind of function, without knowing that you are doing,
> can lead to unsafe programs

This method can be used, if you need something more complex
or more logic, without being easily reproducible by the functions above.

Note that this function heavily depends on the database type and
isn't universal, if even supported.

An 'instruction' will be transferred to the database
to be executed; can be unsupported.

Unsupported databases will throw an error object.

#### close()

This method is used to disconnect from the current database;
in case you want to connect to a different database.