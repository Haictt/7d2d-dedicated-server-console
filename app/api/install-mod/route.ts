import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const SERVER_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\7 Days to Die Dedicated Server';
const MODS_DIR = path.join(SERVER_PATH, 'Mods');

export async function POST(req: NextRequest) {
    const tmpZip     = path.join(os.tmpdir(), `7d2d-mod-${Date.now()}.zip`);
    const tmpExtract = path.join(os.tmpdir(), `7d2d-mod-extract-${Date.now()}`);

    try {
        const form = await req.formData();
        const file = form.get('file') as File | null;
        if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

        const fileName = file.name;
        if (!fileName.toLowerCase().endsWith('.zip')) {
            return NextResponse.json({ success: false, error: 'Only .zip files are supported' }, { status: 400 });
        }

        // Write zip to temp file
        const buf = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(tmpZip, buf);
        await fs.ensureDir(tmpExtract);

        // Extract
        const ps = `Expand-Archive -Path '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${tmpExtract.replace(/'/g, "''")}' -Force`;
        await execFileAsync('powershell', ['-NoProfile', '-Command', ps]);

        // Determine mod folder
        const extracted = await fs.readdir(tmpExtract);
        let srcFolder   = tmpExtract;
        let modName: string;

        if (
            extracted.length === 1 &&
            (await fs.stat(path.join(tmpExtract, extracted[0]))).isDirectory()
        ) {
            modName   = extracted[0];
            srcFolder = path.join(tmpExtract, extracted[0]);
        } else {
            modName = fileName.replace(/\.zip$/i, '');
        }

        await fs.ensureDir(MODS_DIR);
        const dest = path.join(MODS_DIR, modName);
        if (fs.existsSync(dest)) await fs.remove(dest);
        await fs.copy(srcFolder, dest);

        return NextResponse.json({ success: true, modName });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    } finally {
        await fs.remove(tmpZip).catch(() => {});
        await fs.remove(tmpExtract).catch(() => {});
    }
}
