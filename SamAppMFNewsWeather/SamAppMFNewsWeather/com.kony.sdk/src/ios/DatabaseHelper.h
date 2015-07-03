//
//  DatabaseHelper.h
//  SyncDemo
//
//  Created by KH200 on 16/04/14.
//
//

#import <Foundation/Foundation.h>

@interface DatabaseHelper : NSObject
+ (instancetype)sharedManager;
- (NSString*)openDB:(NSString*) fileName withPragma:(NSString*)pragmaKey;
- (BOOL)executeUpdate:(NSString*)sql withArgumentsInArray:(NSString *)arguments;
- (BOOL)executeUpdate:(NSString*)sql withParameterDictionary:(NSDictionary *)arguments;
- (NSString*) executeSQL:(NSString*)sql withArgumentsString:(NSString*) params;
- (NSString*) executeSQL:(NSString*)sql withArgumentsInArray:(NSArray*) params;
- (BOOL)beginTransaction;
- (BOOL)commit;
- (BOOL)rollback;
@end
