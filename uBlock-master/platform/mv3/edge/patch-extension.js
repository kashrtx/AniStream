/*******************************************************************************

    uBlock Origin Lite - a comprehensive, MV3-compliant content blocker
    Copyright (C) 2022-present Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock
*/

import fs from 'fs/promises';
import process from 'process';

/******************************************************************************/

const commandLineArgs = (( ) => {
    const args = Object.create(null);
    let name, value;
    for ( const arg of process.argv.slice(2) ) {
        const pos = arg.indexOf('=');
        if ( pos === -1 ) {
            name = arg;
            value = '';
        } else {
            name = arg.slice(0, pos);
            value = arg.slice(pos+1);
        }
        args[name] = value;
    }
    return args;
})();

/******************************************************************************/

async function main() {
    const packageDir = commandLineArgs.packageDir;
    const manifestPath = `${packageDir}/manifest.json`;

    // Get manifest content
    const manifest = await fs.readFile(manifestPath, { encoding: 'utf8'
    }).then(text =>
        JSON.parse(text)
    );

    // https://learn.microsoft.com/answers/questions/918426/cant-update-extension-with-declarative-net-request
    // Set all ruleset path to package root
    for ( const ruleset of manifest.declarative_net_request.rule_resources ) {
        const pos = ruleset.path.lastIndexOf('/');
        if ( pos === -1 ) { continue; }
        ruleset.path = ruleset.path.slice(pos + 1);
    }
    // Commit changes
    await fs.writeFile(manifestPath,
        JSON.stringify(manifest, null, 2)
    );
}

main();

/******************************************************************************/
