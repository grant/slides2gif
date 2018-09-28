#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var google_auth_library_1 = require("google-auth-library");
var googleapis_1 = require("googleapis");
var download = require('download-file');
var readline = require('readline');
var oauth2ClientSettings = {
    clientId: '1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com',
    clientSecret: 'v6V3fKV_zWU7iw1DrpO1rknX',
    redirectUri: 'http://localhost',
};
var globalOauth2Client = new google_auth_library_1.OAuth2Client(oauth2ClientSettings);
var slides = googleapis_1.google.slides({ version: 'v1', auth: globalOauth2Client });
// If modifying these scopes, delete token.json.
var SCOPES = ['https://www.googleapis.com/auth/presentations.readonly'];
var TOKEN_PATH = 'token.json';
// Load client secrets from a local file.
fs_1.readFile('credentials.json', function (err, content) {
    if (err)
        return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Slides API.
    authorize(JSON.parse(content.toString()), listSlides);
});
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    // const {client_secret, client_id, redirect_uris} = credentials.installed;
    // globalOauth2Client = new google.auth.OAuth2(
    //     client_id, client_secret, redirect_uris[0]);
    // Check if we have previously stored a token.
    fs_1.readFile(TOKEN_PATH, function (err, token) {
        if (err)
            return getNewToken(globalOauth2Client, callback);
        globalOauth2Client.setCredentials(JSON.parse(token.toString()));
        callback(globalOauth2Client);
    });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    var authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oAuth2Client.getToken(code, function (err, token) {
            if (err)
                return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs_1.writeFile(TOKEN_PATH, JSON.stringify(token), function (err) {
                if (err)
                    console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}
function listSlides() {
    return __awaiter(this, void 0, void 0, function () {
        var slidesId, p, presoSlides, i, _i, presoSlides_1, slide, thumbnail, _a, contentUrl, height, width, options;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    slidesId = '1TOZawYQsYFzqd_gf1ZZyuhlXycio3Ylh-HAF_qz_5qU';
                    return [4 /*yield*/, slides.presentations.get({
                            presentationId: slidesId,
                        })];
                case 1:
                    p = _b.sent();
                    if (p.data.slides) {
                        console.log(p.data.slides.length + " slides.");
                    }
                    presoSlides = p.data.slides;
                    if (!presoSlides)
                        return [2 /*return*/];
                    i = 0;
                    _i = 0, presoSlides_1 = presoSlides;
                    _b.label = 2;
                case 2:
                    if (!(_i < presoSlides_1.length)) return [3 /*break*/, 5];
                    slide = presoSlides_1[_i];
                    return [4 /*yield*/, slides.presentations.pages.getThumbnail({
                            presentationId: slidesId,
                            pageObjectId: slide.objectId,
                        })];
                case 3:
                    thumbnail = _b.sent();
                    _a = thumbnail.data, contentUrl = _a.contentUrl, height = _a.height, width = _a.width;
                    console.log(contentUrl + " (" + width + "x" + height + ")");
                    options = {
                        directory: "./images/",
                        filename: i + ".png"
                    };
                    // Test image:
                    // var contentUrl = "http://i.imgur.com/G9bDaPH.jpg"
                    download(contentUrl, options, function (err) {
                        if (err)
                            throw err;
                    });
                    ++i;
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log('good5');
                    return [2 /*return*/];
            }
        });
    });
}
