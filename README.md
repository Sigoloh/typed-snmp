# Typed SNMP

## Overview
This library is a TypeScript rewrite of the well-known [snmp-native](https://www.npmjs.com/package/snmp-native), which implements the SNMP protocol over native Node.js. The goal was to enhance the development experience and modernize some outdated standards from the original code.

## Features
- [X] SNMP V1
- [X] SNMP V2
- [X] Get Requests
- [X] Set Requests
- [X] Get Next Requests
- [X] Get Bulk Requests
- [X] Get Subtree
- [X] Walk

**Note:** This library does not support SNMP v3 yet. Any help with this will be welcome.

## Installation

```sh
npm install typed-native-snmp
```

## Usage

This library supports using the provided methods in two forms: callbacks and promises.

### Using Callbacks
To use the callback version, you need to import the `Session`.

```typescript
import { Session, VarBind } from 'typed-native-snmp';

const session = new Session({
    host: '192.168.0.1',
    community: 'public',
    port: 161,
    version: 0
});

function callback(err: any, varbinds: VarBind[]): void {
    if (err) {
        throw err;
    }

    console.log(varbinds);
}

session.get({ oid: '1.3.2.1' }, callback);

session.close();
```

### Using Promises
Using the promise version is just as easy; you just need to import the `AsyncSession` instead:

```typescript
import { AsyncSession } from 'typed-native-snmp';

const session = new AsyncSession({
    host: '192.168.0.1',
    community: 'public',
    port: 161,
    version: 0
});

session.get({ oid: '1.3.2.1' })
    .then(varbinds => {
        console.log(varbinds);
    })
    .catch(err => {
        console.log(err);
    });

session.close();
```

Both the callback and promise versions have the same methods and implement the same types.

## Configuration Options

The `Session` and `AsyncSession` constructors accept any valid instance of `SessionOption`. If no option is provided, the default values are:

```typescript
const defaultOptions = {
    host: 'localhost',
    port: 161,
    bindPort: 0,
    community: 'public',
    family: 'udp4',
    timeouts: [5000, 5000, 5000, 5000],
    version: versions.SNMPv2c
};
```

The `SessionOption` also provides a method to parse the SNMP VarBinds received from the hardware as you want, with a method called `msgReceived` that must follow this type:

```typescript
msgReceived: (msg: Buffer, rinfo: any) => any
```

If no custom message parser is provided, the default is to parse everything according to the [ASN.1](https://en.wikipedia.org/wiki/ASN.1) rules.

## Built-in Dictionaries

The package also comes with built-in dictionaries for all the ASN.1 types for request and response types, as well as the dictionaries for the errors that can occur in the communication between the software and the hardware you are managing.

All these dictionaries can be accessed using:

```typescript
// Request and Response data types
import { types } from 'typed-native-snmp';

// PDU types
import { pduTypes } from 'typed-native-snmp';

// Request and Response errors
import { errors } from 'typed-native-snmp';
```

## The Walk Method
The walk method works just like the standard `getSubtree` method but can be used with a function as a parameter to format or parse the received message as you need.

## Contributing
First of all, a HUGE thanks to the original developer of the JavaScript library [calmh](https://github.com/calmh) and all the contributors who have helped this library so far:
- [bangert](https://github.com/bangert)
- [Eden-Sun](https://github.com/Eden-Sun)
- [gregmac](https://github.com/gregmac)
- [lqmanh](https://github.com/lqmanh)
- [ddolcimascolo](https://github.com/ddolcimascolo)
- [xuannnaux](https://github.com/xuannnaux)
- [fmgdias](https://github.com/fmgdias)
- [rsolomo](https://github.com/rsolomo)

<br/>

I made this TypeScript library to use at work, so I only implemented what I needed to get tasks done. If you want to contribute, fork the project, create a branch for your code, and open a pull request to the master branch. Any help will be greatly appreciated.