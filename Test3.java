package org.edipa;

import java.io.*;

public class Test3 {
public static void main(String[] args) throws Exception {
  Process p; InputStream pi, pe;
  ProcessBuilder builder = new ProcessBuilder();
  builder.directory(new File("."));
System.out.println("..1");
  //builder.command("sh", "-c", "node test2.js offer");
  //builder.command("/usr/local/bin/node test2.js offer");
  //builder.command("npm", "update");
  //p = builder.start();
  Runtime rt = Runtime.getRuntime();
  p = rt.exec("node test2.js offer");
  pi = p.getInputStream();
  pe = p.getErrorStream();
  String line;
System.out.println("..2");
  BufferedReader br = new BufferedReader(new InputStreamReader(pi));
  BufferedReader er = new BufferedReader(new InputStreamReader(pi));
  while((line=er.readLine())!=null) {
    System.out.println(line);
  }
System.out.println("..3");
}}

