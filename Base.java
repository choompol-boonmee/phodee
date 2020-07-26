package org.edipa;

import java.io.*;
import java.util.*;
import java.nio.*;
import java.net.*;

public class Base {

  final static long TIME_TO_KILL = 30;

  List<InputStream> aIs = new ArrayList<>();
  List<InputStream> aEs = new ArrayList<>();
  List<Process> aPr = new ArrayList<>();
  List<ByteBuffer> aBo = new ArrayList<>();
  List<ByteBuffer> aBe = new ArrayList<>();
  class ProcInfo {
    Process p; InputStream pi,pe;
    String work = "";
    ProcInfo(Process p0, InputStream pi0, InputStream pe0) 
      { p=p0; pi=pi0; pe=pe0; }
    long lastTime = System.currentTimeMillis();
    boolean isAlive() {
      try {
        if(!p.isAlive()) return false;
        long t1 = System.currentTimeMillis();
        if(pi.available()>0) lastTime = t1;
        if(pe.available()>0) lastTime = t1;
        long t2 = t1 - lastTime;
        if(t2>TIME_TO_KILL*1000) return false;
        //lastTime = t1;
      } catch(Exception z) {
        return false;
      }
      return true;
    }
  }
  List<ProcInfo> aInf = new ArrayList<>();

  int find(byte[] buf, int s, int e, byte k) {
    for(int i=s; i<e; i++) if(buf[i]==k) return i;
    return -1;
  }
  void procout(String h, InputStream is, List<String> aOut, ByteBuffer bb) {
    try {
      byte[] b0 = bb.array();
      ByteBuffer tmp1 = ByteBuffer.allocate(4096);
      byte[] tp = tmp1.array();
      while(is.available()>0) {
        int i0 = bb.position();
        int ln = is.read(b0, i0, bb.capacity()-i0);
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
    } catch(IOException x) {
      x.printStackTrace();
    }
  }
  boolean die = false;
  class Shutdown extends Thread {
    public void run() {
      int no = aInf.size();
      die = true;
/*
      while(aInf.size()>0) {
        aInf.remove(0);
        aPr.remove(0);
      }
*/
/*
      for(int i=0; i<no; i++) {
        String urls = "http://localhost:"+(port+i)+"/close";
        try {
          URL url = new URL(urls);
          System.out.println(i+" try close "+urls);
          URLConnection urlc = url.openConnection();
          urlc.setDoOutput(false);
          urlc.setAllowUserInteraction(false);
          InputStream is = urlc.getInputStream();
          HttpURLConnection conn = (HttpURLConnection) url.openConnection();
          conn.setRequestMethod("GET");
          System.out.println(i+":"+urls+ conn.getResponseCode());
        } catch(Exception z) {
          z.printStackTrace();
        }
      }
*/
/*
      for(Process p: aPr) {
        //System.out.println("destroy process");
        try {
          p.destroy();
        } catch(Exception x) {}
      }
*/
    }
  }
  int port, numb;
  void proc(int pt, int pn) {
    port = pt;
    numb = pn;
    String cmd = "";
    Runtime rt = Runtime.getRuntime();
    rt.addShutdownHook(new Shutdown()); 

    //ProcessBuilder pb = new ProcessBuilder();
    //int pt = 3300;
    //pb.command("sh", "-c", "node rtc-base-1.0.js "+pt+" "+pn);
    try {
//System.out.println("pn="+pn);
      Process p; InputStream pi, pe;
      cmd = "node rtc-base-1.0.js "+pt+" "+pn;
      aPr.add(p=rt.exec(cmd));
      aIs.add(pi=p.getInputStream());
      aEs.add(pe=p.getErrorStream());
      aBo.add(ByteBuffer.allocate(4096));
      aBe.add(ByteBuffer.allocate(4096));
      aInf.add(new ProcInfo(p,pi,pe));
      for(int i=1; i<=pn; i++) {
        //pb.command("sh", "-c", "node rtc-work-1.0.js "+pt+" "+i);
        cmd = "node rtc-work-1.0.js "+pt+" "+i;
        aPr.add(p=rt.exec(cmd));
        aIs.add(pi=p.getInputStream());
        aEs.add(pe=p.getErrorStream());
        aBo.add(ByteBuffer.allocate(4096));
        aBe.add(ByteBuffer.allocate(4096));
        aInf.add(new ProcInfo(p,pi,pe));
      }
      int ln;
      long t0 = System.currentTimeMillis();
      while(!die) {
        List<String> aOut = new ArrayList<>();
        long t1 = System.currentTimeMillis();
        if(t1-t0>1000) {
          t0 = t1;
          System.out.print("!! ");
          for(int i=0; i<=pn; i++) {
            ProcInfo px = aInf.get(i);
            long t2 = t0 - px.lastTime;
            System.out.print(i+":"+px.work+"("+(t2/1000)+") ");
          }
          System.out.println();
        }
        for(int i=0; i<=pn; i++) {
          p = aPr.get(i);
          ProcInfo pInf = aInf.get(i);
          if(!die && !pInf.isAlive()) {
            if(die) break;
            System.out.println("P"+i+" die and restart "+die);
            if(die) break;
            p.destroy();
            if(i==0) {
              cmd = "node rtc-base-1.0.js "+pt+" "+pn;
              //pb.command("sh", "-c", "node rtc-base-1.0.js "+pt+" "+pn);
            } else {
              cmd = "node rtc-work-1.0.js "+pt+" "+i;
              //pb.command("sh", "-c", "node rtc-work-1.0.js "+pt+" "+i);
            }
            aPr.set(i, p=rt.exec(cmd));
            //aPr.set(i, p=pb.start());
            aIs.set(i, pi=p.getInputStream());
            aEs.set(i, pe=p.getErrorStream());
            aBo.set(i, ByteBuffer.allocate(4096));
            aBe.set(i, ByteBuffer.allocate(4096));
            aInf.set(i, new ProcInfo(p,pi,pe));
          }
        }
        for(int i=0; i<=pn; i++) {
          procout("P"+i, aIs.get(i), aOut, aBo.get(i));
          procout("E"+i, aEs.get(i), aOut, aBe.get(i));
          //Thread.sleep(100);
        }
        int i1;
        for(String s: aOut) {
          if(s.indexOf("C1-")>0) continue;
          if(s.indexOf("C2-")>0) continue;
          if(s.indexOf("tojoin")>0) continue;
          if(s.indexOf("TOJOIN")>0) continue;
          if(s.indexOf("ICE STATE")>0) continue;
          if((i1=s.indexOf(":WORK"))>0) {
            int no = Integer.parseInt(s.substring(1,i1));
            ProcInfo pInf = aInf.get(no);
            String x = s.substring(i1+6);
            if(no>0) pInf.work = x;
            continue;
          }
          if((i1=s.indexOf(":MAIN"))>0) {continue;}
          if((i1=s.indexOf(":CLOSE"))>0) {continue;}
          System.out.println(s);
        }
      }
    } catch(Exception z) {
      z.printStackTrace();
    }
  }
public static void main(String[] args) throws Exception {
  // java Base 3000 4
  new Base().proc(Integer.parseInt(args[0]),Integer.parseInt(args[1]));
}}

