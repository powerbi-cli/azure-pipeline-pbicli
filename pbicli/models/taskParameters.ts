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

import { getBoolInput, getInput, getPathInput, getVariable, loc } from "azure-pipelines-task-lib";

import { ScriptLocation, ScriptTypes } from "../lib/enum";

export enum Clouds {
    PUBLIC,
    GCC,
    GCCHIGH,
    DOD,
    GERMANY,
    CHINA,
}

export class TaskParameters {
    private cloud: Clouds;
    private scriptType: ScriptTypes;
    private scriptLocation: ScriptLocation;
    private scriptArguments: string;
    private scriptPath?: string;
    private inlineScript?: string;
    private version: string;
    private powerShellErrorActionPreference?: string;
    private powerShellIgnoreLASTEXITCODE: boolean;
    private cwd?: string;
    private failOnStdErr: boolean;
    private debug: boolean;

    constructor() {
        try {
            const cloud = getInput("cloud", false) || "public";
            switch (cloud.toLowerCase()) {
                case "china":
                    this.cloud = Clouds.CHINA;
                    break;
                case "dod":
                    this.cloud = Clouds.DOD;
                    break;
                case "gcc":
                    this.cloud = Clouds.GCC;
                    break;
                case "gcchigh":
                    this.cloud = Clouds.GCCHIGH;
                    break;
                case "germany":
                    this.cloud = Clouds.GERMANY;
                    break;
                case "public":
                default:
                    this.cloud = Clouds.PUBLIC;
            }

            const scriptType = getInput("scriptType", true) as string;
            switch (scriptType.toLowerCase()) {
                case "ps":
                    this.scriptType = ScriptTypes.PS;
                    break;
                case "pscore":
                    this.scriptType = ScriptTypes.PSCORE;
                    break;
                case "bash":
                    this.scriptType = ScriptTypes.BASH;
                    break;
                case "batch":
                default:
                    this.scriptType = ScriptTypes.BATCH;
                    break;
            }

            const scriptLocation = getInput("scriptLocation", true) as string;
            switch (scriptLocation.toLowerCase()) {
                case "scriptpath":
                    this.scriptLocation = ScriptLocation.SCRIPTPATH;
                    break;
                case "inlinescript":
                default:
                    this.scriptLocation = ScriptLocation.INLINESCRIPT;
                    break;
            }
            this.scriptArguments = getInput("scriptArguments", false) as string;
            this.scriptPath = getPathInput("scriptPath", false);
            this.inlineScript = getInput("inlineScript", false);
            this.cwd = getPathInput("cwd", false, false);
            this.powerShellErrorActionPreference = getInput("powerShellErrorActionPreference", false);
            this.powerShellIgnoreLASTEXITCODE = getBoolInput("powerShellIgnoreLASTEXITCODE", false);
            this.failOnStdErr = getBoolInput("failOnStandardError", false);
            this.version = getInput("version", false) as string;
            const debug = getVariable("System.Debug") || "";
            if (debug.toLowerCase() === "true") {
                this.debug = true;
            } else {
                this.debug = getBoolInput("verbose", false);
            }
        } catch (err: unknown) {
            if (err) {
                throw new Error(err as string);
            } else {
                throw new Error(loc("TaskParameters_ConstructorFailed", err));
            }
        }
    }

    public get Cloud(): Clouds {
        return this.cloud;
    }

    public get ScriptType(): ScriptTypes {
        return this.scriptType;
    }

    public get ScriptLocation(): ScriptLocation {
        return this.scriptLocation;
    }

    public get ScriptArguments(): string {
        return this.scriptArguments;
    }

    public get ScriptPath(): string | undefined {
        return this.scriptPath;
    }

    public get InlineScript(): string | undefined {
        return this.inlineScript;
    }

    public get Cwd(): string | undefined {
        return this.cwd;
    }

    public get PowerShellErrorActionPreference(): string {
        return this.powerShellErrorActionPreference || "Stop";
    }

    public get PowerShellIgnoreLASTEXITCODE(): boolean {
        return this.powerShellIgnoreLASTEXITCODE;
    }

    public get FailOnStdErr(): boolean {
        return this.failOnStdErr;
    }

    public get Version(): string {
        return this.version || "latest";
    }

    public get Debug(): boolean {
        return this.debug;
    }
}
