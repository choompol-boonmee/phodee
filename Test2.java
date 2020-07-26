package org.edipa;

import java.io.*;
import java.nio.*;
import java.util.*;

public class Test2 {
  final static long TIME_TO_KILL = 30;
  int step = 0;
  List<ProcInfo> aOff = new ArrayList<>();
  List<ProcInfo> aAns = new ArrayList<>();
  List<ProcInfo> aSpy = new ArrayList<>();
  List<List<ProcInfo>> aBlk;
  String cmd;
  Runtime rt;
  class ProcInfo {
    Process p; InputStream pi, pe;
    String conid, work, state="_", hd, cmd;
    int count = 0;
    ByteBuffer bb = ByteBuffer.allocate(4096);
    ProcInfo(String c, String h) {
      try {
      cmd = c;
      p = rt.exec(cmd);
      pi = p.getInputStream();
      pe = p.getErrorStream();
      hd = h;
      } catch(Exception x) {}
    }
    long lastTime = System.currentTimeMillis();
    boolean isAlive() {
      try {
        if(!p.isAlive()) return false;
        return true;
      } catch(Exception z) {
        return false;
      }
    }
    void streamLine(String h, List<String> aOut) {
      try {
        byte[] b0 = bb.array();
        ByteBuffer tmp1 = ByteBuffer.allocate(4096);
        byte[] tp = tmp1.array();
        while(pi.available()>0) {
          int i0 = bb.position();
          int ln = pi.read(b0, i0, bb.capacity()-i0);
          bb.position(i0+ln);
          while(true) {
            int ka = find(b0, 0, bb.position(), (byte)10);
            if(ka>=0) {
              bb.flip();
              tmp1.clear();
              for(int k=0; k<=ka; k++) tmp1.put(bb.get());
              String sa = new String(tp, 0, tmp1.position()-1);
              aOut.add(h+":"+ sa);
              bb.compact();
              continue;
            }
            break;
          }
        }
      } catch(Exception x) {
        //x.printStackTrace();
      }
    }
  }
  String replaceWithCode(String st, ProcInfo pInf) {
    if("connect".equals(st)) { 
      st = "A";
    } else if("tojoin".equals(st)) {
      st = "B";
    } else if("emitcand1".equals(st)) {
      st = "C";
    } else if("appidreq".equals(st)) {
      st = "D";
    } else if("joining".equals(st)) {
      st = "E";
    } else if("heartbeat_recv".equals(st)) {
      st = "F";
    } else if("heartbeat_send".equals(st)) {
      st = "G";
    } else if("oncand2".equals(st)) {
      //st = "H";
      st = pInf.state;
    } else if("heartbeat_check".equals(st)) {
      st = "I";
    } else if("ready".equals(st)) {
      st = "J";
    } else if("start_connect".equals(st)) {
      st = "K";
    } else if("heartbeat".equals(st)) {
      //st = "X";
      st = pInf.state;
    } else if("CloseChannel".equals(st)) {
      st = "M";
    } else if("OpenChannel".equals(st)) {
      st = "N";
    } else if("peer-start".equals(st)) {
      st = "a";
    } else if("sig_joined".equals(st)) {
      st = "b";
    } else if("count".equals(st)) {
      //st = "c";
      st = pInf.state;
    } else if("sig_cand2".equals(st)) {
      //st = "d";
      st = pInf.state;
    } else if("killSocket".equals(st)) {
      st = "e";
    } else if("sig_connect".equals(st)) {
      st = "f";
    }
    return st;
  }
  int find(byte[] buf, int s, int e, byte k) {
    for(int i=s; i<e; i++) if(buf[i]==k) return i;
    return -1; 
  }
  class Shutdown extends Thread {
    public void run() {
      System.out.println("---- shutdown ----");
      for(List<ProcInfo> aPI : aBlk) {
        for(ProcInfo pInf : aPI) {
          try {
            //System.out.println("  "+pInf.hd+" "+pInf.conid);
            pInf.p.destroy();
          } catch(Exception z) {
            z.printStackTrace();
          }
        }
      }
    }
  }

  public void proc(int pcnt) {
    aBlk = new ArrayList<>(Arrays.asList(aOff,aAns,aSpy));
    rt = Runtime.getRuntime();
    rt.addShutdownHook(new Shutdown());
    Process p; InputStream po,pe;
    System.out.println("Test2 "+pcnt);
    ProcessBuilder builder = new ProcessBuilder();
    builder.directory(new File("."));
    try {
      step = 1;
      for(int i=0; i<pcnt; i++) {
        //builder.command("sh", "-c", "node test2.js offer");
        //ProcInfo pOffer = new ProcInfo(p=builder.start()
        cmd = "node test2.js offer";
        ProcInfo pOffer = new ProcInfo(cmd, "a");
        //ProcInfo pOffer = new ProcInfo(p=rt.exec(cmd)
        //  , po=p.getInputStream(), pe=p.getErrorStream());
        //builder.command("sh", "-c", "node test2.js answer");
        cmd = "node test2.js answer";
        ProcInfo pAnswer = new ProcInfo(cmd, "b");
        //ProcInfo pAnswer = new ProcInfo(p=rt.exec(cmd)
        //  , po=p.getInputStream(), pe=p.getErrorStream());
        aOff.add(pOffer);
        aAns.add(pAnswer);
      }

      long t0 = System.currentTimeMillis();
      while(true) { // Begin of watch loop
        List<String> aOut = new ArrayList<>();
        long t1 = System.currentTimeMillis();

        if(t1-t0>1000) {// Begin of show every second
          t0 = t1;
          if(step==1) {
            System.out.print("STEP1: ");
            for(int i=0; i<pcnt; i++) {
              ProcInfo pa = aOff.get(i);
              ProcInfo pb = aAns.get(i);
              System.out.print(" "+pa.state+":"+pb.state);
            }
            System.out.println();
          } else if(step==2) {
            System.out.print("STEP2: ");
            System.out.println();
          } else if(step==3) {
            System.out.print("STEP4: ");
            for(int i=0; i<pcnt; i++) {
              ProcInfo pa = aOff.get(i);
              ProcInfo pb = aAns.get(i);
              ProcInfo pc = aSpy.get(i);
              System.out.print(" "+pa.state+":"+pb.state+"="+pc.state);
            }
            System.out.println();
          }
        } // End of show every second
     
        //List<List<ProcInfo>> aBlk = new ArrayList<>();
        //aBlk.add(aOff); aBlk.add(aAns); aBlk.add(aSpy);
        for(int t=0; t<3; t++) {
          List<ProcInfo> inf = aBlk.get(t);
          for(int i=0; i<inf.size(); i++) {
            ProcInfo pp = inf.get(i);
            if(!pp.isAlive()) {
              pp.p.destroy();
              inf.set(i, new ProcInfo(pp.cmd, pp.hd));
            }
            pp.streamLine(pp.hd+i, aOut);
          }
        }

        for(String s: aOut) { // Begin analyse message
          String p1 = "recv count: ";
          String p2 = "state: ";
          String p3 = "CONID: ";
          String p4 = "MONITOR";
          int i1,i2;
          int c = -1;
          String tp = null;
          if((i1=s.indexOf(":"))>0) { // Begin check process line
            c = Integer.parseInt(s.substring(1,i1));
            ProcInfo pInf = aOff.get(c);
            if(s.charAt(0)=='b') pInf = aAns.get(c);
            if(s.charAt(0)=='c') pInf = aSpy.get(c);

            if((i2=s.indexOf(p1, i1+1))>=0) { // check count
              int cnt = Integer.parseInt(s.substring(i2+p1.length()));
              pInf.count = cnt;
              //cnt /= 10;
              pInf.state = ""+cnt;
//System.out.println(".1.."+pInf.state);
            } else if((i2=s.indexOf(p2, i1+1))>=0) { // check state
              String st = s.substring(i2+p2.length());
              st = replaceWithCode(st, pInf);
              pInf.state = st;
//System.out.println(".2.."+pInf.state);
            } else if((i2=s.indexOf(p3, i1+1))>=0) { // check conid
              pInf.conid = s.substring(i2+p3.length());
              //String conid = s.substring(i2+p3.length());
              //System.out.println(s+" '"+pInf.conid+"'");
//System.out.println(".3.."+pInf.state);
            } else if((i2=s.indexOf(p4, i1+1))>=0) { // check conid
//System.out.println(".4.."+pInf.state);
              //System.out.println(s);
            } else {
//System.out.println(".5.."+pInf.state);
              System.out.println("__:" + s);
            }
          } // End check process line
        } // End analyse message

        // Begin of checking step condition
        if(step==1) {
          int okcnt = 0;
          for(int i=0; i<pcnt; i++) {
            ProcInfo pa = aOff.get(i);
            ProcInfo pb = aAns.get(i);
            if(pa.count>1 && pb.count>1) okcnt++;
          }
          if(okcnt==pcnt) { step = 2; }
        }
        if(step==2) {
          for(int i=0; i<pcnt; i++) {
            ProcInfo pa = aOff.get(i);
            ProcInfo pb = aAns.get(i);
            //builder.command("sh", "-c"
              //, "node test2.js spy "+pa.conid+" "+pb.conid);
              //, "node webrtc2.js spy "+pa.conid+" "+pb.conid);
            cmd = "node test2.js spy "+pa.conid+" "+pb.conid;
            ProcInfo pSpy = new ProcInfo(cmd, "c");
            //ProcInfo pSpy = new ProcInfo(p=rt.exec(cmd)
            //  , po=p.getInputStream(), pe=p.getErrorStream());
            aSpy.add(pSpy);
          }
          step = 3;
        }
        if(step==3) {
        }
        // End of checking step condition

      } // End of watch loop
    } catch(Exception z) {
      z.printStackTrace();
    }
  }

public static void main(String[] args) throws Exception {
  new Test2().proc(Integer.parseInt(args[0]));
}}

