"use server"



import fs from 'fs-extra';

import path from 'path';

import os from 'os';

import { exec, spawn, execFile } from 'child_process';

import { promisify } from 'util';

import { parseXmlProperties, applyXmlProperties } from './lib/xml-utils';

import { SCHEMA_FIELD_NAMES } from './lib/config-schema';



const execFileAsync = promisify(execFile);



// === CONFIGURE YOUR PATHS HERE ===

const SERVER_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\7 Days to Die Dedicated Server';

const CONFIG_FILE = path.join(SERVER_PATH, 'serverconfig.xml');

const SAVE_DIR = 'C:\\Users\\Admin\\AppData\\Roaming\\7DaysToDie\\Saves';

const MODS_DIR = path.join(SERVER_PATH, 'Mods');



// === NETWORK (Tailscale + game port) ===

const TAILSCALE_IP = '100.101.64.25';

const GAME_PORT = 26900;



export async function getServerInfo() {

    return {

        ip: TAILSCALE_IP,

        port: GAME_PORT,

        address: `${TAILSCALE_IP}:${GAME_PORT}`,

    };

}



function startServerProcess(): { success: boolean; msg: string } {

    const exePath = path.join(SERVER_PATH, '7DaysToDieServer.exe');

    if (!fs.existsSync(exePath)) {

        return { success: false, msg: "7DaysToDieServer.exe not found! Check SERVER_PATH in actions.ts." };

    }

    try {

        const child = spawn('7DaysToDieServer.exe', [

            '-quit', '-batchmode', '-nographics',

            '-configfile=serverconfig.xml', '-dedicated',

        ], {

            cwd: SERVER_PATH,

            detached: true,

            stdio: 'ignore',

            windowsHide: false,

            env: { ...process.env, SteamAppId: '251570', SteamGameId: '251570' },

        });

        child.unref();

        return { success: true, msg: "Server started!" };

    } catch {

        return { success: false, msg: "Start error!" };

    }

}



function stopServerProcess(): Promise<void> {

    return new Promise((resolve) => {

        exec('taskkill /f /im 7DaysToDieServer.exe', () => resolve());

    });

}



export async function executeCommand(command: 'start' | 'stop' | 'restart') {

    if (command === 'start') return startServerProcess();

    if (command === 'stop') {

        await stopServerProcess();

        return { success: true, msg: "Server stopped!" };

    }

    await stopServerProcess();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const result = startServerProcess();

    return result.success ? { success: true, msg: "Server restarted!" } : result;

}



// === CONFIG EDITOR ===

export async function getConfigProperties() {

    try {

        if (!fs.existsSync(CONFIG_FILE)) {

            return { properties: {}, otherProperties: {}, error: "Config file not found!" };

        }

        const xml = await fs.readFile(CONFIG_FILE, 'utf-8');

        const all = parseXmlProperties(xml);

        const properties: Record<string, string> = {};

        const otherProperties: Record<string, string> = {};

        for (const [key, val] of Object.entries(all)) {

            if (SCHEMA_FIELD_NAMES.has(key)) properties[key] = val;

            else otherProperties[key] = val;

        }

        return { properties, otherProperties, error: null };

    } catch (e: any) {

        return { properties: {}, otherProperties: {}, error: e.message };

    }

}



export async function saveConfigProperties(updates: Record<string, string>) {

    try {

        const xml = await fs.readFile(CONFIG_FILE, 'utf-8');

        const updated = applyXmlProperties(xml, updates);

        await fs.writeFile(CONFIG_FILE, updated, 'utf-8');

        return { success: true, msg: "Configuration saved successfully!" };

    } catch (e: any) {

        return { success: false, msg: `Error saving file: ${e.message}` };

    }

}



// === FILES ===

export type SaveFileEntry = {
    name: string;
    relativePath: string; // relative to SAVE_DIR, uses '/' separator
    size: string;
    sizeBytes: number;
    modified: string;
    isDir: boolean;
};

// List a single directory level inside SAVE_DIR.
// subPath is relative to SAVE_DIR using '/' separators (empty = root).
export async function listSaveDir(subPath: string = ''): Promise<{
    entries: SaveFileEntry[];
    error: string | null;
}> {
    try {
        // Sanitize: normalise separators, strip leading slash, reject traversal
        const clean = subPath.replace(/\\/g, '/').replace(/^\/+/, '');
        if (clean.split('/').some((p) => p === '..' || p === '.')) {
            return { entries: [], error: 'Invalid path' };
        }

        const targetDir = clean ? path.join(SAVE_DIR, ...clean.split('/')) : SAVE_DIR;

        // Security: make sure target is still inside SAVE_DIR
        const resolved = path.resolve(targetDir);
        const saveResolved = path.resolve(SAVE_DIR);
        if (!resolved.startsWith(saveResolved)) {
            return { entries: [], error: 'Access denied' };
        }

        if (!fs.existsSync(targetDir)) {
            return { entries: [], error: 'Directory not found' };
        }

        const names = await fs.readdir(targetDir);
        const entries: SaveFileEntry[] = [];

        for (const name of names) {
            const full = path.join(targetDir, name);
            const relativePath = clean ? `${clean}/${name}` : name;
            const stats = await fs.stat(full);
            entries.push({
                name,
                relativePath,
                size: stats.isDirectory() ? '—' : formatBytes(stats.size),
                sizeBytes: stats.size,
                modified: stats.mtime.toISOString(),
                isDir: stats.isDirectory(),
            });
        }

        // Folders first, then files; both sorted by name
        entries.sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        return { entries, error: null };
    } catch (e: any) {
        return { entries: [], error: e.message };
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}



async function createZipBuffer(sourcePath: string, isDir: boolean): Promise<Buffer> {

    const zipPath = path.join(os.tmpdir(), `7d2d-${Date.now()}.zip`);

    const ps = isDir

        ? `Compress-Archive -Path '${sourcePath.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`

        : `Compress-Archive -Path '${sourcePath.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`;

    await execFileAsync('powershell', ['-NoProfile', '-Command', ps]);

    const buf = await fs.readFile(zipPath);

    await fs.remove(zipPath);

    return buf;

}



export async function downloadFileZip(relativePath: string) {

    try {

        const filePath = path.join(SAVE_DIR, relativePath);

        if (!fs.existsSync(filePath)) {

            return { success: false, msg: 'File not found' };

        }

        const stats = await fs.stat(filePath);

        const buf = await createZipBuffer(filePath, stats.isDirectory());

        const baseName = path.basename(relativePath, path.extname(relativePath));

        return {

            success: true,

            filename: `${baseName}.zip`,

            data: buf.toString('base64'),

        };

    } catch (e: any) {

        return { success: false, msg: e.message };

    }

}



// === LOGS ===

async function findLatestLogFile(): Promise<string | null> {

    if (!fs.existsSync(SERVER_PATH)) return null;

    const files = await fs.readdir(SERVER_PATH);

    const logFiles = files.filter((f) =>

        (f.startsWith('output_log_dedi') || f === 'output_log.txt') && f.endsWith('.txt')

    );

    if (logFiles.length === 0) return null;



    let newest = logFiles[0];

    let newestTime = 0;

    for (const f of logFiles) {

        const mtime = (await fs.stat(path.join(SERVER_PATH, f))).mtimeMs;

        if (mtime > newestTime) {

            newestTime = mtime;

            newest = f;

        }

    }

    return path.join(SERVER_PATH, newest);

}



export async function getServerLogs(search: string = '', maxLines: number = 1000) {

    try {

        const logPath = await findLatestLogFile();

        if (!logPath || !fs.existsSync(logPath)) {

            return { lines: [], total: 0, file: null, fetchedAt: new Date().toISOString() };

        }



        const content = await fs.readFile(logPath, 'utf-8');

        let lines = content.split(/\r?\n/).filter((l) => l.length > 0);

        const total = lines.length;



        if (search.trim()) {

            const pattern = new RegExp(search.trim(), 'i');

            lines = lines.filter((l) => pattern.test(l));

        }



        const tail = lines.slice(-maxLines);

        return {

            lines: tail.map((text, i) => ({ num: total - tail.length + i + 1, text })),

            total,

            file: path.basename(logPath),

            fetchedAt: new Date().toISOString(),

        };

    } catch (e: any) {

        return { lines: [], total: 0, file: null, fetchedAt: new Date().toISOString(), error: e.message };

    }

}



// === MODS ===

export type ModEntry = {
    name: string;         // folder name (without _disabled_ prefix)
    folderName: string;   // actual folder name on disk
    enabled: boolean;
    hasModInfo: boolean;  // has ModInfo.xml?
    sizeKb: number;
};

async function getFolderSizeKb(dir: string): Promise<number> {
    try {
        let total = 0;
        for (const name of await fs.readdir(dir)) {
            const full = path.join(dir, name);
            const s = await fs.stat(full);
            total += s.isDirectory() ? await getFolderSizeKb(full) : s.size;
        }
        return Math.round(total / 1024);
    } catch {
        return 0;
    }
}

export async function getMods(): Promise<{ mods: ModEntry[]; error: string | null }> {
    try {
        await fs.ensureDir(MODS_DIR);
        const names = await fs.readdir(MODS_DIR);
        const mods: ModEntry[] = [];

        for (const folderName of names) {
            const full = path.join(MODS_DIR, folderName);
            if (!(await fs.stat(full)).isDirectory()) continue;

            const disabled = folderName.startsWith('_disabled_');
            const name = disabled ? folderName.slice('_disabled_'.length) : folderName;
            const hasModInfo = fs.existsSync(path.join(full, 'ModInfo.xml'));
            const sizeKb = await getFolderSizeKb(full);

            mods.push({ name, folderName, enabled: !disabled, hasModInfo, sizeKb });
        }

        mods.sort((a, b) => a.name.localeCompare(b.name));
        return { mods, error: null };
    } catch (e: any) {
        return { mods: [], error: e.message };
    }
}

export async function toggleMod(folderName: string, enable: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const src = path.join(MODS_DIR, folderName);
        const disabled = folderName.startsWith('_disabled_');
        const baseName = disabled ? folderName.slice('_disabled_'.length) : folderName;
        const dst = path.join(MODS_DIR, enable ? baseName : `_disabled_${baseName}`);
        if (src !== dst) await fs.rename(src, dst);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMod(folderName: string): Promise<{ success: boolean; error?: string }> {
    try {
        const target = path.join(MODS_DIR, folderName);
        const resolved = path.resolve(target);
        if (!resolved.startsWith(path.resolve(MODS_DIR))) {
            return { success: false, error: 'Access denied' };
        }
        await fs.remove(target);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

