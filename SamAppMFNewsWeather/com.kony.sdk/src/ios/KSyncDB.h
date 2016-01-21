//
//  HelloPlugin.h
//  SyncDemo
//
//  Created by KH200 on 15/04/14.
//
//

#import <Cordova/CDV.h>

@interface KSyncDB : CDVPlugin
- (void)openDb:(CDVInvokedUrlCommand*)command;
- (void)startTransaction:(CDVInvokedUrlCommand*)command;
- (void)beginTransaction:(CDVInvokedUrlCommand*)command;
- (void)commit:(CDVInvokedUrlCommand*)command;
- (void)rollback:(CDVInvokedUrlCommand*)command;
- (void)executeSql:(CDVInvokedUrlCommand*)command;
@end
