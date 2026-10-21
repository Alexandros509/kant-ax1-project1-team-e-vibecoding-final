import {APP_FLOW_FRAME,validUiTarget} from './app-flow';
export function reportFlowPreview(name:string,queued:boolean,target?:string,itemId?:number){
 if(typeof window==='undefined'||window.name!==APP_FLOW_FRAME||window.parent===window)return;
 window.parent.postMessage({type:'onepiece-flow-event',payload:{name,path:location.pathname,delivery:queued?'ga4_queued':'local_only',at:Date.now(),...(validUiTarget(target)?{target}:{}),...(Number.isSafeInteger(itemId)&&itemId!>0?{itemId}:{})}},location.origin);
}
