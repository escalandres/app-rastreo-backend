import { MongoClient } from 'mongodb';
import {generarOTP, generateTimestamp, isEmptyObj, formatDateToTimestamp} from './utils.mjs';
import crypto from 'crypto';
import { link } from 'fs';
import { consoleLog } from './utils.mjs';
import e from 'cors';
//import MongoStore from "connect-mongo";