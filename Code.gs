/**
 * ห้องโครงงาน PBL — รูปแบบที่ 3 (จัดเฉพาะบางหน่วยการเรียนรู้)
 * Google Apps Script backend: ใช้ Google Sheet เป็นฐานข้อมูล
 *
 * วิธีติดตั้งโดยย่อ (ดูคู่มือฉบับเต็มในไฟล์ README):
 *  1) เปิด Google Sheet > ส่วนขยาย > Apps Script
 *  2) วางไฟล์นี้เป็น Code.gs และสร้างไฟล์ HTML ชื่อ Index วางเนื้อหา Index.html
 *  3) เลือกฟังก์ชัน setupSheets แล้วกด Run หนึ่งครั้ง (อนุญาตสิทธิ์)
 *  4) ทำให้ใช้งานได้ > การทำให้ใช้งานได้รายการใหม่ > เว็บแอป
 *     ดำเนินการในฐานะ: ฉัน | ผู้มีสิทธิ์เข้าถึง: ทุกคน
 *  5) (ถ้าใช้หน้าเว็บบน GitHub Pages) นำ URL ที่ลงท้ายด้วย /exec ไปใส่ใน docs/config.js
 */

var SHEET_ID = '1ilNfGxlgNwWVAMvf8M8RRh5FqHnLqxqZ-c1_Xc2tgRw';
var APP_TITLE = 'ห้องโครงงาน PBL';
var SESSION_HOURS = 6;

/* ===================== GAS ENTRY POINTS ===================== */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** รับคำขอจากหน้าเว็บที่โฮสต์ภายนอก (เช่น GitHub Pages) ส่ง JSON {action, payload, token} */
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) {}
  var res = api(body.action, body.payload, body.token);
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

/** จุดเรียกเดียวจากหน้าเว็บ: google.script.run.api(action, payload, token) */
function api(action, payload, token) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var core = getCore_();
    return { ok: true, data: core.handle(String(action || ''), payload || {}, token || '') };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/** รันครั้งแรกจากหน้า Apps Script เพื่อสร้างแผ่นงานทั้งหมดและรหัสผู้ดูแลเริ่มต้น */
function setupSheets() {
  var core = getCore_();
  core.ensureAll();
  Logger.log('สร้างแผ่นงานเรียบร้อย รหัสผู้ดูแลเริ่มต้นคือ admin1234 (กรุณาเปลี่ยนทันทีในระบบหลังบ้าน)');
}

/** ใช้กรณีลืมรหัสผู้ดูแล: รันฟังก์ชันนี้จากหน้า Apps Script เพื่อรีเซ็ตเป็น admin1234 */
function resetAdminPassword() {
  var core = getCore_();
  core.resetAdmin();
  Logger.log('รีเซ็ตรหัสผู้ดูแลเป็น admin1234 แล้ว');
}

function getCore_() {
  return Core.create({
    makeDB: makeSheetDB_,
    session: {
      put: function (t, obj) { CacheService.getScriptCache().put('s_' + t, JSON.stringify(obj), SESSION_HOURS * 3600); },
      get: function (t) { var v = CacheService.getScriptCache().get('s_' + t); return v ? JSON.parse(v) : null; },
      del: function (t) { CacheService.getScriptCache().remove('s_' + t); }
    },
    hash: function (text) {
      var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'pbl3::' + text, Utilities.Charset.UTF_8);
      return raw.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
    },
    now: function () { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'); },
    uid: function () { return Utilities.getUuid().replace(/-/g, ''); }
  });
}

/* ---------- Sheet-backed table adapter ---------- */
function makeSheetDB_(SCHEMA) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var cache = {};

  function cell(v) {
    if (v === null || v === undefined || v === '') return '';
    return "'" + String(v); // บังคับเป็นข้อความ: รักษาเลข 0 นำหน้าเบอร์โทร และกันสูตร
  }

  function sheetOf(t) {
    var def = SCHEMA[t];
    var s = ss.getSheetByName(def.sheet);
    if (!s) {
      s = ss.insertSheet(def.sheet);
      var hdr = def.cols.map(function (c) { return c[1]; });
      s.getRange(1, 1, 1, hdr.length).setValues([hdr])
        .setFontWeight('bold').setBackground('#0f5a4e').setFontColor('#ffffff');
      s.setFrozenRows(1);
      s.getRange(1, 1, s.getMaxRows(), hdr.length).setNumberFormat('@');
      try { s.autoResizeColumns(1, hdr.length); } catch (e) {}
    }
    return s;
  }

  function load(t) {
    if (cache[t]) return cache[t];
    var def = SCHEMA[t], s = sheetOf(t);
    var lastCol = Math.max(s.getLastColumn(), 1);
    var lastRow = Math.max(s.getLastRow(), 1);
    var vals = s.getRange(1, 1, lastRow, lastCol).getValues();
    var header = vals[0].map(function (h) { return String(h).trim(); });
    var idx = def.cols.map(function (c) {
      var i = header.indexOf(c[1]);
      if (i < 0) i = header.indexOf(c[0]);
      return i;
    });
    // เพิ่มคอลัมน์ที่ขาดหายไปต่อท้าย
    def.cols.forEach(function (c, j) {
      if (idx[j] < 0) {
        header.push(c[1]);
        idx[j] = header.length - 1;
        s.getRange(1, header.length).setValue(c[1]).setFontWeight('bold');
      }
    });
    var width = header.length;
    var rows = [];
    for (var r = 1; r < vals.length; r++) {
      var raw = vals[r].slice();
      while (raw.length < width) raw.push('');
      var o = { _row: r + 1, _raw: raw }, empty = true;
      def.cols.forEach(function (c, j) {
        var v = raw[idx[j]];
        if (v instanceof Date) v = Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
        v = (v === null || v === undefined) ? '' : String(v);
        if (v !== '') empty = false;
        o[c[0]] = v;
      });
      if (!empty) rows.push(o);
    }
    cache[t] = { rows: rows, idx: idx, width: width, sheet: s, nextRow: vals.length + 1 };
    return cache[t];
  }

  function toRaw(t, obj, base) {
    var c = load(t), def = SCHEMA[t];
    var raw = base ? base.slice() : [];
    while (raw.length < c.width) raw.push('');
    def.cols.forEach(function (col, j) {
      if (obj.hasOwnProperty(col[0])) raw[c.idx[j]] = cell(obj[col[0]]);
      else if (base) {
        var v = raw[c.idx[j]];
        raw[c.idx[j]] = (v instanceof Date) ? v : cell(v === null || v === undefined ? '' : String(v));
      }
    });
    return raw;
  }

  function strip(o) {
    var x = {};
    for (var k in o) if (k !== '_row' && k !== '_raw') x[k] = o[k];
    return x;
  }

  return {
    all: function (t) { return load(t).rows.map(strip); },
    insert: function (t, obj) {
      var c = load(t), def = SCHEMA[t];
      var full = {};
      def.cols.forEach(function (col) { full[col[0]] = obj[col[0]] !== undefined ? String(obj[col[0]]) : ''; });
      var raw = toRaw(t, full, null);
      c.sheet.getRange(c.nextRow, 1, 1, c.width).setValues([raw]);
      full._row = c.nextRow; full._raw = raw;
      c.nextRow++;
      c.rows.push(full);
      return strip(full);
    },
    update: function (t, pred, patch) {
      var c = load(t), n = 0;
      c.rows.forEach(function (o) {
        if (!pred(strip(o))) return;
        for (var k in patch) o[k] = String(patch[k]);
        var raw = toRaw(t, patch, o._raw);
        o._raw = raw;
        c.sheet.getRange(o._row, 1, 1, c.width).setValues([raw]);
        n++;
      });
      return n;
    },
    remove: function (t, pred) {
      var c = load(t);
      var targets = c.rows.filter(function (o) { return pred(strip(o)); })
        .map(function (o) { return o._row; }).sort(function (a, b) { return b - a; });
      targets.forEach(function (r) { c.sheet.deleteRow(r); });
      delete cache[t];
      return targets.length;
    },
    ensure: function (t) { load(t); }
  };
}

// ==== CORE START
/* ===================== CORE (ใช้ร่วมกับโหมดตัวอย่างในเบราว์เซอร์) ===================== */
var Core = (function () {
  var SCHEMA = {
    students: { sheet: 'นักศึกษา', cols: [['student_id', 'รหัสนักศึกษา'], ['name', 'ชื่อ-สกุล'], ['phone', 'เบอร์โทร'], ['level', 'ระดับชั้น'], ['department', 'สาขาวิชา'], ['group_id', 'รหัสกลุ่ม'], ['created_at', 'วันที่ลงทะเบียน']] },
    teachers: { sheet: 'ครูผู้สอน', cols: [['teacher_id', 'รหัสครู'], ['name', 'ชื่อ-สกุล'], ['phone', 'เบอร์โทร'], ['department', 'แผนก/สาขา'], ['created_at', 'วันที่ลงทะเบียน']] },
    groups: { sheet: 'กลุ่มโครงงาน', cols: [['group_id', 'รหัสกลุ่ม'], ['project_name', 'ชื่อโครงงาน'], ['project_type', 'ประเภทโครงงาน'], ['format', 'รูปแบบการจัด'], ['subject_code', 'รหัสวิชา'], ['subject_name', 'ชื่อวิชา'], ['units', 'หน่วยการเรียนรู้ (JSON)'], ['teacher_id', 'รหัสครูผู้สอน'], ['lesson_done', 'ผ่านบทเรียน'], ['created_by', 'ผู้สร้างกลุ่ม'], ['created_at', 'วันที่สร้าง'], ['updated_at', 'อัปเดตล่าสุด']] },
    progress: { sheet: 'ความก้าวหน้า', cols: [['group_id', 'รหัสกลุ่ม'], ['track', 'เส้นทาง'], ['step', 'ขั้น'], ['sub', 'ขั้นย่อย'], ['status', 'สถานะ'], ['work', 'บันทึกผลงาน'], ['link', 'ลิงก์ผลงาน'], ['updated_by', 'ผู้บันทึก'], ['updated_at', 'เวลาบันทึก'], ['review_status', 'ผลตรวจครู'], ['review_comment', 'ความเห็นครู'], ['score', 'คะแนน'], ['reviewed_at', 'เวลาตรวจ']] },
    settings: { sheet: 'ตั้งค่า', cols: [['key', 'key'], ['value', 'value']] },
    logs: { sheet: 'บันทึกการใช้งาน', cols: [['time', 'เวลา'], ['role', 'บทบาท'], ['user_id', 'ผู้ใช้'], ['action', 'การทำงาน'], ['detail', 'รายละเอียด']] }
  };
  // จำนวนขั้นย่อยของการทำโครงงาน 6 ขั้น และจำนวนขั้นของการเขียนเล่ม 11 ขั้น
  var P_SUBS = [4, 6, 7, 5, 5, 5];
  var R_STEPS = 11;
  var DONE = { done: 1, submitted: 1 };
  var STATUSES = { todo: 1, doing: 1, done: 1, submitted: 1 };
  var DEFAULT_ADMIN = 'admin1234';

  function create(env) {
    var db = env.makeDB(SCHEMA);

    /* ---------- helpers ---------- */
    function s(v, max) { v = (v === null || v === undefined) ? '' : String(v).trim(); return max ? v.slice(0, max) : v; }
    function fail(msg) { throw new Error(msg); }
    function idOk(v) { return /^[0-9A-Za-z\-_.]{3,20}$/.test(v); }
    function phoneOk(v) { return /^[0-9+\- ]{9,15}$/.test(v); }
    function one(t, key, val) { var r = db.all(t).filter(function (o) { return o[key] === val; }); return r.length ? r[0] : null; }
    function setting(k, dflt) { var r = one('settings', 'key', k); return r ? r.value : dflt; }
    function setSetting(k, v) {
      if (one('settings', 'key', k)) db.update('settings', function (o) { return o.key === k; }, { value: v });
      else db.insert('settings', { key: k, value: v });
    }
    function log(role, uid, action, detail) {
      try { db.insert('logs', { time: env.now(), role: role, user_id: uid, action: action, detail: s(detail, 200) }); } catch (e) {}
    }
    function ensureAdmin() { if (!setting('admin_hash', '')) setSetting('admin_hash', env.hash(DEFAULT_ADMIN)); }
    function startSession(obj) { var t = env.uid(); env.session.put(t, obj); return t; }
    function maxMembers() { var n = parseInt(setting('max_members', '5'), 10); return isNaN(n) ? 5 : n; }
    function pubTeacher(t) { return t ? { teacher_id: t.teacher_id, name: t.name, department: t.department } : null; }
    function maskPhone(p) { p = s(p); return p.length >= 7 ? p.slice(0, 3) + '-xxx-' + p.slice(-4) : p; }
    function parseUnits(u) { try { var a = JSON.parse(u || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }

    function summarize(rows) {
      var sum = { P: 0, R: 0, pTotal: 0, rTotal: R_STEPS, pending: 0, revise: 0, approved: 0, last: '' };
      P_SUBS.forEach(function (n) { sum.pTotal += n; });
      rows.forEach(function (r) {
        if (DONE[r.status]) { if (r.track === 'P') sum.P++; else if (r.track === 'R') sum.R++; }
        if (r.status === 'submitted' && r.review_status === 'pending') sum.pending++;
        if (r.review_status === 'revise') sum.revise++;
        if (r.review_status === 'approved') sum.approved++;
        if (r.updated_at > sum.last) sum.last = r.updated_at;
      });
      sum.pPct = Math.round(sum.P * 100 / sum.pTotal);
      sum.rPct = Math.round(sum.R * 100 / sum.rTotal);
      return sum;
    }

    function groupBundle(gid, opts) {
      var g = one('groups', 'group_id', gid);
      if (!g) return null;
      var members = db.all('students').filter(function (o) { return o.group_id === gid; })
        .map(function (m) { return { student_id: m.student_id, name: m.name, phone: opts && opts.fullPhone ? m.phone : maskPhone(m.phone), level: m.level, department: m.department }; });
      var progress = db.all('progress').filter(function (o) { return o.group_id === gid; });
      var t = g.teacher_id ? one('teachers', 'teacher_id', g.teacher_id) : null;
      g.units = parseUnits(g.units);
      return { group: g, members: members, teacher: pubTeacher(t), progress: progress, summary: summarize(progress) };
    }

    function studentState(sid) {
      var st = one('students', 'student_id', sid);
      if (!st) fail('SESSION: ไม่พบข้อมูลนักศึกษา กรุณาเข้าสู่ระบบใหม่');
      var bundle = st.group_id ? groupBundle(st.group_id) : null;
      return {
        me: st, bundle: bundle, maxMembers: maxMembers(),
        teachers: db.all('teachers').map(pubTeacher)
      };
    }

    function requireGroup(sess) {
      var st = one('students', 'student_id', sess.id);
      if (!st || !st.group_id) fail('ยังไม่มีกลุ่ม กรุณาบันทึกข้อมูลโครงงานก่อน');
      return st.group_id;
    }

    function cleanUnits(arr) {
      if (!Array.isArray(arr)) return [];
      return arr.slice(0, 30).map(function (u) {
        return { no: s(u.no, 10), name: s(u.name, 150), pbl: !!u.pbl };
      }).filter(function (u) { return u.name; });
    }

    function upsertStudent(p, gid) {
      var id = s(p.student_id, 20), name = s(p.name, 100), phone = s(p.phone, 15);
      if (!idOk(id)) fail('รหัสนักศึกษาไม่ถูกต้อง (ตัวเลข/ตัวอักษร 3–20 ตัว)');
      var ex = one('students', 'student_id', id);
      if (ex) return ex;
      if (!name) fail('กรุณากรอกชื่อ-สกุลของ ' + id);
      if (!phoneOk(phone)) fail('กรุณากรอกเบอร์โทรให้ถูกต้อง (9–10 หลัก)');
      return db.insert('students', { student_id: id, name: name, phone: phone, level: s(p.level, 30), department: s(p.department, 80), group_id: gid || '', created_at: env.now() });
    }

    function upsertTeacher(p) {
      var id = s(p.teacher_id, 20), name = s(p.name, 100), phone = s(p.phone, 15);
      if (!idOk(id)) fail('รหัสครูไม่ถูกต้อง (ตัวเลข/ตัวอักษร 3–20 ตัว)');
      var ex = one('teachers', 'teacher_id', id);
      if (ex) return ex;
      if (!name) fail('กรุณากรอกชื่อ-สกุลครู');
      if (!phoneOk(phone)) fail('กรุณากรอกเบอร์โทรครูให้ถูกต้อง');
      return db.insert('teachers', { teacher_id: id, name: name, phone: phone, department: s(p.department, 80), created_at: env.now() });
    }

    function doReview(gid, p, reviewer) {
      var track = s(p.track), step = s(p.step), sub = s(p.sub || '0');
      var rs = s(p.review_status);
      if (rs !== 'approved' && rs !== 'revise') fail('ผลตรวจต้องเป็น "ผ่าน" หรือ "ส่งกลับแก้ไข"');
      var score = s(p.score, 6);
      if (score && isNaN(Number(score))) fail('คะแนนต้องเป็นตัวเลข');
      var match = function (o) { return o.group_id === gid && o.track === track && o.step === step && o.sub === sub; };
      var patch = { review_status: rs, review_comment: s(p.review_comment, 2000), score: score, reviewed_at: env.now() };
      if (rs === 'revise') patch.status = 'doing';
      if (!db.update('progress', match, patch)) {
        patch.group_id = gid; patch.track = track; patch.step = step; patch.sub = sub;
        patch.status = rs === 'approved' ? 'done' : 'doing'; patch.updated_by = reviewer; patch.updated_at = env.now();
        db.insert('progress', patch);
      }
      log('teacher', reviewer, 'review', gid + ' ' + track + step + '.' + sub + ' ' + rs);
      return groupBundle(gid);
    }

    /* ---------- public actions ---------- */
    var PUBLIC = {
      loginStudent: function (p) {
        var id = s(p.student_id, 20);
        if (!idOk(id)) fail('กรุณากรอกรหัสนักศึกษาให้ถูกต้อง');
        var st = one('students', 'student_id', id);
        if (!st) return { needRegister: true };
        log('student', id, 'login', '');
        return { token: startSession({ role: 'student', id: id }), role: 'student' };
      },
      registerStudent: function (p) {
        var st = upsertStudent(p, '');
        log('student', st.student_id, 'register', '');
        return { token: startSession({ role: 'student', id: st.student_id }), role: 'student' };
      },
      loginTeacher: function (p) {
        var id = s(p.teacher_id, 20);
        if (!idOk(id)) fail('กรุณากรอกรหัสครูให้ถูกต้อง');
        var t = one('teachers', 'teacher_id', id);
        if (!t) return { needRegister: true };
        log('teacher', id, 'login', '');
        return { token: startSession({ role: 'teacher', id: id }), role: 'teacher' };
      },
      registerTeacher: function (p) {
        var t = upsertTeacher(p);
        log('teacher', t.teacher_id, 'register', '');
        return { token: startSession({ role: 'teacher', id: t.teacher_id }), role: 'teacher' };
      },
      loginAdmin: function (p) {
        ensureAdmin();
        if (env.hash(s(p.password)) !== setting('admin_hash', '')) { log('admin', '-', 'login-failed', ''); fail('รหัสผู้ดูแลไม่ถูกต้อง'); }
        log('admin', 'admin', 'login', '');
        return { token: startSession({ role: 'admin', id: 'admin' }), role: 'admin', defaultPassword: s(p.password) === DEFAULT_ADMIN };
      },
      logout: function (p, sess, token) { return true; }
    };

    /* ---------- role actions ---------- */
    var STUDENT = {
      me: function (p, sess) { return studentState(sess.id); },
      saveSetup: function (p, sess) {
        var st = one('students', 'student_id', sess.id);
        var patch = {};
        if (p.project_name !== undefined) patch.project_name = s(p.project_name, 200);
        if (p.project_type !== undefined) patch.project_type = s(p.project_type, 80);
        if (p.subject_code !== undefined) patch.subject_code = s(p.subject_code, 20);
        if (p.subject_name !== undefined) patch.subject_name = s(p.subject_name, 150);
        if (p.units !== undefined) {
          var units = cleanUnits(p.units);
          if (!units.some(function (u) { return u.pbl; })) fail('เลือกหน่วยที่จัดแบบโครงงานอย่างน้อย 1 หน่วย');
          patch.units = JSON.stringify(units);
        }
        if (p.teacher_id !== undefined) {
          var tid = s(p.teacher_id, 20);
          if (tid && !one('teachers', 'teacher_id', tid)) fail('ไม่พบรหัสครูนี้ในระบบ');
          patch.teacher_id = tid;
        }
        if (p.lesson_done) patch.lesson_done = '1';
        patch.updated_at = env.now();
        if (!st.group_id) {
          if (!patch.project_type) fail('กรุณาเลือกประเภทโครงงาน');
          var gid = 'G' + env.uid().slice(0, 6).toUpperCase();
          patch.group_id = gid; patch.format = 'รูปแบบที่ 3 จัดเฉพาะบางหน่วยการเรียนรู้';
          patch.created_by = sess.id; patch.created_at = env.now();
          db.insert('groups', patch);
          db.update('students', function (o) { return o.student_id === sess.id; }, { group_id: gid });
          log('student', sess.id, 'create-group', gid);
        } else {
          db.update('groups', function (o) { return o.group_id === st.group_id; }, patch);
          log('student', sess.id, 'update-group', st.group_id);
        }
        return studentState(sess.id);
      },
      lookupStudent: function (p) {
        var id = s(p.student_id, 20);
        var st = one('students', 'student_id', id);
        if (!st) return { exists: false };
        return { exists: true, student_id: st.student_id, name: st.name, phone: maskPhone(st.phone), group_id: st.group_id };
      },
      addMember: function (p, sess) {
        var gid = requireGroup(sess);
        var count = db.all('students').filter(function (o) { return o.group_id === gid; }).length;
        if (count >= maxMembers()) fail('กลุ่มมีสมาชิกครบ ' + maxMembers() + ' คนแล้ว');
        var st = upsertStudent(p, gid);
        if (st.group_id && st.group_id !== gid) fail(st.name + ' อยู่ในกลุ่มอื่นแล้ว (' + st.group_id + ')');
        db.update('students', function (o) { return o.student_id === st.student_id; }, { group_id: gid });
        log('student', sess.id, 'add-member', st.student_id);
        return studentState(sess.id);
      },
      removeMember: function (p, sess) {
        var gid = requireGroup(sess), id = s(p.student_id, 20);
        if (id === sess.id) fail('ไม่สามารถลบตัวเองออกจากกลุ่มได้');
        db.update('students', function (o) { return o.student_id === id && o.group_id === gid; }, { group_id: '' });
        log('student', sess.id, 'remove-member', id);
        return studentState(sess.id);
      },
      addTeacher: function (p, sess) {
        var t = upsertTeacher(p);
        var st = one('students', 'student_id', sess.id);
        if (st.group_id) db.update('groups', function (o) { return o.group_id === st.group_id; }, { teacher_id: t.teacher_id, updated_at: env.now() });
        log('student', sess.id, 'add-teacher', t.teacher_id);
        return studentState(sess.id);
      },
      saveProgress: function (p, sess) {
        var gid = requireGroup(sess);
        var track = s(p.track), step = s(p.step), sub = s(p.sub || '0'), status = s(p.status);
        if (track !== 'P' && track !== 'R' && track !== 'D') fail('เส้นทางไม่ถูกต้อง');
        if (!STATUSES[status]) fail('สถานะไม่ถูกต้อง');
        // D = เนื้อหาเล่มรายงานสำหรับดาวน์โหลด Word (1 ช่องของ Google Sheet เก็บได้ไม่เกิน 50,000 ตัวอักษร)
        if (String(p.work || '').length > 45000) fail('ข้อความยาวเกิน 45,000 ตัวอักษร กรุณาแบ่งเนื้อหาหรือย้ายบางส่วนไปภาคผนวก');
        var patch = { status: status, work: s(p.work, 45000), link: s(p.link, 500), updated_by: sess.id, updated_at: env.now() };
        if (status === 'submitted') patch.review_status = 'pending';
        var match = function (o) { return o.group_id === gid && o.track === track && o.step === step && o.sub === sub; };
        var ex = db.all('progress').filter(match)[0];
        if (ex && ex.review_status === 'approved' && status !== 'submitted') patch.review_status = 'approved';
        if (ex) db.update('progress', match, patch);
        else { patch.group_id = gid; patch.track = track; patch.step = step; patch.sub = sub; if (!patch.review_status) patch.review_status = ''; db.insert('progress', patch); }
        log('student', sess.id, 'progress', track + step + '.' + sub + ' ' + status);
        return studentState(sess.id);
      }
    };

    var TEACHER = {
      teacherHome: function (p, sess) {
        var t = one('teachers', 'teacher_id', sess.id);
        if (!t) fail('SESSION: ไม่พบข้อมูลครู');
        var groups = db.all('groups').filter(function (g) { return g.teacher_id === sess.id; })
          .map(function (g) { return groupBundle(g.group_id); });
        return { me: t, groups: groups };
      },
      groupDetail: function (p, sess) {
        var g = one('groups', 'group_id', s(p.group_id));
        if (!g || g.teacher_id !== sess.id) fail('กลุ่มนี้ไม่ได้เลือกท่านเป็นครูผู้สอน');
        return groupBundle(g.group_id, { fullPhone: true });
      },
      review: function (p, sess) {
        var g = one('groups', 'group_id', s(p.group_id));
        if (!g || g.teacher_id !== sess.id) fail('กลุ่มนี้ไม่ได้เลือกท่านเป็นครูผู้สอน');
        return doReview(g.group_id, p, sess.id);
      },
      updateProfile: function (p, sess) {
        var patch = {};
        if (p.name) patch.name = s(p.name, 100);
        if (p.phone) { if (!phoneOk(s(p.phone))) fail('เบอร์โทรไม่ถูกต้อง'); patch.phone = s(p.phone, 15); }
        if (p.department !== undefined) patch.department = s(p.department, 80);
        db.update('teachers', function (o) { return o.teacher_id === sess.id; }, patch);
        return TEACHER.teacherHome(p, sess);
      }
    };

    var ADMIN = {
      adminOverview: function () {
        var groups = db.all('groups').map(function (g) { return groupBundle(g.group_id, { fullPhone: true }); });
        return {
          students: db.all('students'),
          teachers: db.all('teachers'),
          groups: groups,
          settings: { max_members: String(maxMembers()) },
          logs: db.all('logs').slice(-60).reverse()
        };
      },
      adminSaveRecord: function (p) {
        var t = s(p.table), r = p.record || {};
        if (t === 'students') {
          var id = s(r.student_id, 20);
          if (!idOk(id)) fail('รหัสนักศึกษาไม่ถูกต้อง');
          var patch = { name: s(r.name, 100), phone: s(r.phone, 15), level: s(r.level, 30), department: s(r.department, 80) };
          if (r.group_id !== undefined) {
            var gid = s(r.group_id, 20);
            if (gid && !one('groups', 'group_id', gid)) fail('ไม่พบรหัสกลุ่ม ' + gid);
            patch.group_id = gid;
          }
          if (one('students', 'student_id', id)) db.update('students', function (o) { return o.student_id === id; }, patch);
          else { patch.student_id = id; patch.created_at = env.now(); db.insert('students', patch); }
        } else if (t === 'teachers') {
          var tid = s(r.teacher_id, 20);
          if (!idOk(tid)) fail('รหัสครูไม่ถูกต้อง');
          var tp = { name: s(r.name, 100), phone: s(r.phone, 15), department: s(r.department, 80) };
          if (one('teachers', 'teacher_id', tid)) db.update('teachers', function (o) { return o.teacher_id === tid; }, tp);
          else { tp.teacher_id = tid; tp.created_at = env.now(); db.insert('teachers', tp); }
        } else if (t === 'groups') {
          var g = s(r.group_id, 20);
          if (!one('groups', 'group_id', g)) fail('ไม่พบกลุ่ม');
          var gp = { project_name: s(r.project_name, 200), teacher_id: s(r.teacher_id, 20), updated_at: env.now() };
          if (gp.teacher_id && !one('teachers', 'teacher_id', gp.teacher_id)) fail('ไม่พบรหัสครู ' + gp.teacher_id);
          db.update('groups', function (o) { return o.group_id === g; }, gp);
        } else fail('ตารางไม่ถูกต้อง');
        log('admin', 'admin', 'save-' + t, JSON.stringify(r).slice(0, 120));
        return ADMIN.adminOverview();
      },
      adminDeleteRecord: function (p) {
        var t = s(p.table), id = s(p.id, 20);
        if (t === 'students') db.remove('students', function (o) { return o.student_id === id; });
        else if (t === 'teachers') {
          db.remove('teachers', function (o) { return o.teacher_id === id; });
          db.update('groups', function (o) { return o.teacher_id === id; }, { teacher_id: '' });
        } else if (t === 'groups') {
          db.update('students', function (o) { return o.group_id === id; }, { group_id: '' });
          db.remove('progress', function (o) { return o.group_id === id; });
          db.remove('groups', function (o) { return o.group_id === id; });
        } else fail('ตารางไม่ถูกต้อง');
        log('admin', 'admin', 'delete-' + t, id);
        return ADMIN.adminOverview();
      },
      adminImport: function (p) {
        var t = s(p.table), rows = Array.isArray(p.rows) ? p.rows.slice(0, 2000) : [];
        var added = 0, updated = 0, errors = [];
        rows.forEach(function (r, i) {
          try {
            if (t === 'students') {
              var id = s(r.student_id, 20);
              if (!idOk(id)) throw new Error('รหัสไม่ถูกต้อง');
              if (one('students', 'student_id', id)) {
                var up = {}; ['name', 'phone', 'level', 'department'].forEach(function (k) { if (s(r[k])) up[k] = s(r[k], 100); });
                db.update('students', function (o) { return o.student_id === id; }, up); updated++;
              } else {
                db.insert('students', { student_id: id, name: s(r.name, 100), phone: s(r.phone, 15), level: s(r.level, 30), department: s(r.department, 80), group_id: '', created_at: env.now() }); added++;
              }
            } else if (t === 'teachers') {
              var tid = s(r.teacher_id, 20);
              if (!idOk(tid)) throw new Error('รหัสไม่ถูกต้อง');
              if (one('teachers', 'teacher_id', tid)) {
                var tu = {}; ['name', 'phone', 'department'].forEach(function (k) { if (s(r[k])) tu[k] = s(r[k], 100); });
                db.update('teachers', function (o) { return o.teacher_id === tid; }, tu); updated++;
              } else {
                db.insert('teachers', { teacher_id: tid, name: s(r.name, 100), phone: s(r.phone, 15), department: s(r.department, 80), created_at: env.now() }); added++;
              }
            } else throw new Error('ตารางไม่ถูกต้อง');
          } catch (e) { errors.push('แถว ' + (i + 1) + ': ' + e.message); }
        });
        log('admin', 'admin', 'import-' + t, added + ' เพิ่ม / ' + updated + ' แก้ไข');
        return { added: added, updated: updated, errors: errors.slice(0, 20), overview: ADMIN.adminOverview() };
      },
      adminGroup: function (p) { return groupBundle(s(p.group_id), { fullPhone: true }); },
      adminReview: function (p) { return doReview(s(p.group_id), p, 'admin'); },
      adminSetPassword: function (p) {
        ensureAdmin();
        if (env.hash(s(p.old)) !== setting('admin_hash', '')) fail('รหัสเดิมไม่ถูกต้อง');
        if (s(p.next).length < 8) fail('รหัสใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
        setSetting('admin_hash', env.hash(s(p.next)));
        log('admin', 'admin', 'change-password', '');
        return true;
      },
      adminSetSetting: function (p) {
        var n = parseInt(s(p.max_members), 10);
        if (isNaN(n) || n < 1 || n > 20) fail('จำนวนสมาชิกสูงสุดต้องอยู่ระหว่าง 1–20');
        setSetting('max_members', String(n));
        return ADMIN.adminOverview();
      }
    };

    var ROLES = { student: STUDENT, teacher: TEACHER, admin: ADMIN };

    return {
      handle: function (action, p, token) {
        if (action === 'logout') { if (token) env.session.del(token); return true; }
        if (PUBLIC[action]) return PUBLIC[action](p);
        var sess = token ? env.session.get(token) : null;
        if (!sess) fail('SESSION: หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่');
        if (action === 'whoami') return sess;
        var h = ROLES[sess.role] && ROLES[sess.role][action];
        if (!h) fail('ไม่มีสิทธิ์ใช้งานคำสั่งนี้');
        return h(p, sess, token);
      },
      ensureAll: function () { for (var t in SCHEMA) db.ensure(t); ensureAdmin(); if (!setting('max_members', '')) setSetting('max_members', '5'); },
      resetAdmin: function () { setSetting('admin_hash', env.hash(DEFAULT_ADMIN)); },
      db: db
    };
  }

  return { create: create, SCHEMA: SCHEMA };
})();
// ==== CORE END
