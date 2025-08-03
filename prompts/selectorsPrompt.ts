import {OutputChannel} from "vscode";
import * as fs from "node:fs";

export class SelectorsPrompt {
    private feature: string;
    private baseUrl: string;
    private htmlSnapshot: string;
    public prompt: string;

    constructor(feature: string, baseUrl: string, htmlSnapshot: string) {
        this.feature = feature;
        this.baseUrl = baseUrl;
        this.htmlSnapshot = htmlSnapshot;
        const featureString: string = fs.readFileSync(feature,'utf8');
        this.prompt = `
            I am a developer who wants to generate Cypress selectors for a given feature file.
            The feature file is written in gherkin syntax and looks like this:
            ${featureString}
            
            Now I want you to use the defined features in the file and generate me a typescript file with selectors.
            The selectors should be named after the feature steps.
            The selectors should be exported as named functions.
            Use cy.visit, cy.contains, cy.click or any other fitting cypress command.
          
            The selectors should be fitting to this html snapshot:
            ${htmlSnapshot}     
            
            DO NOT write me any comments, JSON, or code fences.
            Just return the selectors as a typescript file.
        `;
    }

  public getPrompt(): string {
        return this.prompt;
  }

}