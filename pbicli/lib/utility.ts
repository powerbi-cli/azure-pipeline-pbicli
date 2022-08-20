/*
 * Power BI CLI Task
 *
 * Copyright (c) 2022 Jan Pieter Posthuma / DataScenarios
 *
 * All rights reserved.
 *
 * MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

// Based on Utility class from the Azure CLI task:
// https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/AzureCLIV2/src/Utility.ts

import { EOL, tmpdir } from "os";
import { join } from "path";
import { existsSync, unlinkSync, WriteFileOptions, writeFileSync } from "fs";
import { assertAgent, error, loc, stats } from "azure-pipelines-task-lib/task";
import { IExecSyncResult } from "azure-pipelines-task-lib/toolrunner";

import { TaskParameters } from "../models/taskParameters";
import { ScriptLocation } from "./enum";

export class Utility {
    public static async getScriptPath(taskParameters: TaskParameters, fileExtensions: string[]): Promise<string> {
        if (taskParameters.ScriptLocation === ScriptLocation.SCRIPTPATH) {
            const filePath: string = taskParameters.ScriptPath as string;
            if (Utility.checkIfFileExists(filePath, fileExtensions)) {
                return filePath;
            }
            throw new Error(loc("JS_InvalidFilePath", filePath));
        }
        const tempDirectory = process.env.AGENT_TEMPDIRECTORY || tmpdir();
        const inlineScript: string = taskParameters.InlineScript as string;
        const scriptPath: string = join(tempDirectory, `pbiclitaskscript${new Date().getTime()}.${fileExtensions[0]}`);
        await Utility.createFile(scriptPath, inlineScript);
        return scriptPath;
    }

    public static async getPowerShellScriptPath(
        taskParameters: TaskParameters,
        fileExtensions: string[]
    ): Promise<string> {
        // Write the script to disk.
        assertAgent("2.115.0");
        const tempDirectory = process.env.AGENT_TEMPDIRECTORY || tmpdir();

        const contents: string[] = [];
        contents.push(`$ErrorActionPreference = '${taskParameters.PowerShellErrorActionPreference}'`);
        contents.push(`$ErrorView = 'NormalView'`);

        let filePath: string | undefined;
        if (taskParameters.ScriptLocation === ScriptLocation.SCRIPTPATH) {
            filePath = taskParameters.ScriptPath as string;
            if (!Utility.checkIfFileExists(filePath, fileExtensions)) {
                throw new Error(loc("JS_InvalidFilePath", filePath));
            }
        } else {
            const inlineScript: string = taskParameters.InlineScript as string;
            filePath = join(tempDirectory, `pbiclitaskscript${new Date().getTime()}_inlinescript.${fileExtensions[0]}`);
            await Utility.createFile(filePath, inlineScript);
        }

        let content = `. '${filePath.replace(/'/g, "''")}' `;
        if (taskParameters.ScriptArguments) {
            content += taskParameters.ScriptArguments;
        }
        contents.push(content.trim());

        if (!taskParameters.PowerShellIgnoreLASTEXITCODE) {
            contents.push(`if (!(Test-Path -LiteralPath variable:LASTEXITCODE)) {`);
            contents.push(`    Write-Host '##vso[task.debug]$LASTEXITCODE is not set.'`);
            contents.push(`} else {`);
            contents.push(`    Write-Host ('##vso[task.debug]$LASTEXITCODE: {0}' -f $LASTEXITCODE)`);
            contents.push(`    exit $LASTEXITCODE`);
            contents.push(`}`);
        }

        const scriptPath: string = join(tempDirectory, `pbiclitaskscript${new Date().getTime()}.${fileExtensions[0]}`);
        await Utility.createFile(scriptPath, "\ufeff" + contents.join(EOL), { encoding: "utf8" });
        return scriptPath;
    }

    public static throwIfError(resultOfToolExecution: IExecSyncResult, errormsg?: string): void {
        if (resultOfToolExecution.code != 0) {
            error("Error Code: [" + resultOfToolExecution.code + "]");
            if (errormsg) {
                error("Error: " + errormsg);
            }
            throw resultOfToolExecution;
        }
    }

    public static async createFile(filePath: string, data: string, options?: WriteFileOptions): Promise<void> {
        try {
            writeFileSync(filePath, data, options);
        } catch (err) {
            Utility.deleteFile(filePath);
            throw err;
        }
    }

    public static checkIfFileExists(filePath: string, fileExtensions: string[]): boolean {
        const matchingFiles: string[] = fileExtensions.filter((fileExtension: string) => {
            if (
                stats(filePath).isFile() &&
                filePath.toUpperCase().match(new RegExp(`.${fileExtension.toUpperCase()}$`))
            ) {
                return true;
            }
        });
        if (matchingFiles.length > 0) {
            return true;
        }
        return false;
    }

    public static async deleteFile(filePath: string): Promise<void> {
        if (existsSync(filePath)) {
            try {
                //delete the publishsetting file created earlier
                unlinkSync(filePath);
            } catch (err: unknown) {
                //error while deleting should not result in task failure
                console.error(err);
            }
        }
    }
}
