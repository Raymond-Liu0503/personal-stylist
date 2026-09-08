export function allowsLocalLogin(development:boolean,environment:string|undefined,url:string){
 if(!development||environment!=='local')return false;
 try{const u=new URL(url);const h=u.hostname;return u.protocol==='http:'&&u.port==='54321'&&(h==='localhost'||h==='127.0.0.1'||/^10\.\d+\.\d+\.\d+$/.test(h)||/^192\.168\.\d+\.\d+$/.test(h)||/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h));}catch{return false;}
}
