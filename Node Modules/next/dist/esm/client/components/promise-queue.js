import { _ as _class_private_field_loose_base } from "@swc/helpers/_/_class_private_field_loose_base";
import { _ as _class_private_field_loose_key } from "@swc/helpers/_/_class_private_field_loose_key";
var _maxConcurrency = /*#__PURE__*/ _class_private_field_loose_key("_maxConcurrency"), _runningCount = /*#__PURE__*/ _class_private_field_loose_key("_runningCount"), _queue = /*#__PURE__*/ _class_private_field_loose_key("_queue"), _processNext = /*#__PURE__*/ _class_private_field_loose_key("_processNext");
/*
    This is a simple promise queue that allows you to limit the number of concurrent promises
    that are running at any given time. It's used to limit the number of concurrent
    prefetch requests that are being made to the server but could be used for other
    things as well.
*/ export class PromiseQueue {
    enqueue(promiseFn) {
        let taskResolve;
        let taskReject;
        const taskPromise = new Promise((resolve, reject)=>{
            taskResolve = resolve;
            taskReject = reject;
        });
        const task = async ()=>{
            try {
                _class_private_field_loose_base(this, _runningCount)[_runningCount]++;
                const result = await promiseFn();
                taskResolve(result);
            } catch (error) {
                taskReject(error);
            } finally{
                _class_private_field_loose_base(this, _runningCount)[_runningCount]--;
                _class_private_field_loose_base(this, _processNext)[_processNext]();
            }
        };
        const enqueueResult = {
            promiseFn: taskPromise,
            task
        };
        // wonder if we should take a LIFO approach here
        _class_private_field_loose_base(this, _queue)[_queue].push(enqueueResult);
        _class_private_field_loose_base(this, _processNext)[_processNext]();
        return taskPromise;
    }
    bump(promiseFn) {
        const index = _class_private_field_loose_base(this, _queue)[_queue].findIndex((item)=>item.promiseFn === promiseFn);
        if (index > -1) {
            const bumpedItem = _class_private_field_loose_base(this, _queue)[_queue].splice(index, 1)[0];
            _class_private_field_loose_base(this, _queue)[_queue].unshift(bumpedItem);
            _class_private_field_loose_base(this, _processNext)[_processNext](true);
        }
    }
    constructor(maxConcurrency = 5){
        Object.defineProperty(this, _processNext, {
            value: processNext
        });
        Object.defineProperty(this, _maxConcurrency, {
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, _runningCount, {
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, _queue, {
            writable: true,
            value: void 0
        });
        _class_private_field_loose_base(this, _maxConcurrency)[_maxConcurrency] = maxConcurrency;
        _class_private_field_loose_base(this, _runningCount)[_runningCount] = 0;
        _class_private_field_loose_base(this, _queue)[_queue] = [];
    }
}
function processNext(forced) {
    if (forced === void 0) forced = false;
    if ((_class_private_field_loose_base(this, _runningCount)[_runningCount] < _class_private_field_loose_base(this, _maxConcurrency)[_maxConcurrency] || forced) && _class_private_field_loose_base(this, _queue)[_queue].length > 0) {
        var _class_private_field_loose_base__queue_shift;
        (_class_private_field_loose_base__queue_shift = _class_private_field_loose_base(this, _queue)[_queue].shift()) == null ? void 0 : _class_private_field_loose_base__queue_shift.task();
    }
}

//# sourceMappingURL=promise-queue.js.map