//
//  HelloPlugin.m
//  SyncDemo
//
//  Created by KH200 on 15/04/14.
//
//

#import "KSyncDB.h"
#import "DatabaseHelper.h"

@implementation KSyncDB {
    DatabaseHelper* _dbHelper;
}

- (void)openDb:(CDVInvokedUrlCommand*)command   {
    _dbHelper = [DatabaseHelper sharedManager];
    NSString *callbackId = command.callbackId;
    NSArray *arguments = command.arguments;
    NSString *dbName = [arguments objectAtIndex:0];
    NSString* pragmaKey = nil;
    CDVPluginResult *result;
    if([arguments count] == 2)  {
        if([NSNull null] != [arguments objectAtIndex:1]) {
              NSArray* pragmaKeys = [arguments objectAtIndex:1];
            if([NSNull null] != [pragmaKeys objectAtIndex:0])  {
                pragmaKey = [pragmaKeys objectAtIndex:0];
            } else  {
                pragmaKey = nil;
            }
        } else  {
            pragmaKey = nil;
        }
    }
    NSString* dbOPenedResult = [_dbHelper openDB:dbName withPragma:pragmaKey];
    if(dbOPenedResult)  {
        result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString: dbOPenedResult];
        [self writeJavascript:[result toSuccessCallbackString:callbackId]];
    } else{
        result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:dbOPenedResult];
        [self writeJavascript:[result toErrorCallbackString:callbackId]];
    }
}

- (void)startTransaction:(CDVInvokedUrlCommand*)command {
    NSArray *arguments = command.arguments;
    NSString *dbName = [arguments objectAtIndex:0];
    NSString *transactionCallBack = [arguments objectAtIndex:1];
    transactionCallBack = [transactionCallBack stringByAppendingString:@"('%@');"];
    //NSLog(@"%@", transactionCallBack);
    [self writeJavascript:[NSString stringWithFormat:@"konySyncTxCallbackWrapper('%@')", dbName]];
}

- (void)beginTransaction:(CDVInvokedUrlCommand*)command {
     [_dbHelper beginTransaction];
}


- (void)commit:(CDVInvokedUrlCommand*)command   {
    [_dbHelper commit];
}

- (void)rollback:(CDVInvokedUrlCommand *)command   {
    [_dbHelper rollback];
}

- (void)executeSql:(CDVInvokedUrlCommand*)command   {
   
    NSString *callbackId = command.callbackId;

    NSArray *arguments = command.arguments;
    //NSString *dbName = [arguments objectAtIndex:0];
    NSString *SqlLiteStatement = [arguments objectAtIndex:1];
    NSDictionary* originalParams = [arguments objectAtIndex:2];
    NSArray *params = nil;
    if([originalParams count])
        params = [originalParams objectForKey:@"0"];
    NSString * resultJSONStr  = [_dbHelper executeSQL:SqlLiteStatement withArgumentsInArray:params];
    CDVPluginResult *result;
    result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString: resultJSONStr];
    [self writeJavascript:[result toSuccessCallbackString:callbackId]];

//    //NSString* callBackName = [arguments objectAtIndex:3];
//    //[callBackName stringByAppendingString:@"('%@');"];
//    [self writeJavascript:[NSString stringWithFormat:@"executeSqlResultCallBack('%@')", resultJSONStr]];
}

@end
