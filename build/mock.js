/* โหมดตัวอย่าง: จำลองเซิร์ฟเวอร์ด้วยโค้ดชุดเดียวกับ Code.gs แต่เก็บข้อมูลในเบราว์เซอร์ */
window.MockServer = (function () {
  var KEY = 'pbl3_demo_db_v1';
  var data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  function now() { var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function hash(t) { var h = 2166136261; t = 'pbl3::' + t; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  function uid() { return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2); }

  function seed() {
    var units = JSON.stringify([
      { no: '1', name: 'การวัดแรงดันและกระแสไฟฟ้า', pbl: false },
      { no: '2', name: 'เซนเซอร์และการวัดความชื้น', pbl: true },
      { no: '3', name: 'การควบคุมด้วยไมโครคอนโทรลเลอร์', pbl: true },
      { no: '4', name: 'ความปลอดภัยในงานไฟฟ้า', pbl: false }
    ]);
    var units2 = JSON.stringify([
      { no: '1', name: 'วงจรไฟฟ้าในอาคาร', pbl: false },
      { no: '2', name: 'การวัดพลังงานไฟฟ้า', pbl: true },
      { no: '3', name: 'การประหยัดพลังงาน', pbl: false }
    ]);
    var T = '2026-10-20 10:15:00';
    function pr(g, track, step, sub, status, work, rs, rc) {
      return { group_id: g, track: track, step: String(step), sub: String(sub), status: status, work: work || '', link: '', updated_by: g === 'GDEMO1' ? '66201010001' : '66201010005', updated_at: T, review_status: rs || '', review_comment: rc || '', score: '', reviewed_at: rs && rs !== 'pending' ? T : '' };
    }
    var progress = [
      pr('GDEMO1', 'P', 1, 1, 'done', 'เป้าหมาย: วัดความชื้นในดินได้ ต่อเซนเซอร์กับบอร์ดได้ เขียนโปรแกรมสั่งปั๊มน้ำได้'),
      pr('GDEMO1', 'P', 1, 2, 'done', 'วัสดุ: เซนเซอร์ความชื้นในดิน 2 ตัว บอร์ดไมโครคอนโทรลเลอร์ รีเลย์ ปั๊มน้ำ 12V (ต้องจัดหา)'),
      pr('GDEMO1', 'P', 1, 3, 'done', 'งบประมาณประมาณ 850 บาท ใช้เวลา 8 สัปดาห์ ความเสี่ยง: ไฟฟ้ากับน้ำ ต้องแยกกล่องวงจร'),
      pr('GDEMO1', 'P', 1, 4, 'done', 'ธนากร หัวหน้า/วงจร · พิมพ์ชนก เอกสาร · อนุชา ชิ้นงานและทดสอบ'),
      pr('GDEMO1', 'P', 2, 1, 'done', 'สัมภาษณ์แปลงผักของวิทยาลัย 3 คน ปัญหา: รดน้ำไม่สม่ำเสมอช่วงวันหยุด'),
      pr('GDEMO1', 'P', 2, 2, 'done', ''), pr('GDEMO1', 'P', 2, 3, 'done', ''), pr('GDEMO1', 'P', 2, 4, 'done', ''), pr('GDEMO1', 'P', 2, 5, 'done', ''),
      pr('GDEMO1', 'P', 2, 6, 'submitted', 'เสนอหัวข้อ เครื่องรดน้ำผักอัตโนมัติด้วยเซนเซอร์ความชื้นในดิน', 'approved', 'อนุมัติหัวข้อ ให้กำหนดค่าความชื้นเป้าหมายให้ชัดในเค้าโครง'),
      pr('GDEMO1', 'P', 3, 1, 'done', 'หลักการเซนเซอร์แบบความต้านทาน, การทำงานของรีเลย์, ความต้องการน้ำของผักบุ้ง'),
      pr('GDEMO1', 'P', 3, 2, 'doing', ''),
      pr('GDEMO1', 'R', 1, 0, 'done', 'Project Brief ฉบับร่าง'),
      pr('GDEMO1', 'R', 2, 0, 'doing', ''),
      pr('GDEMO2', 'P', 1, 1, 'done', ''), pr('GDEMO2', 'P', 1, 2, 'done', ''), pr('GDEMO2', 'P', 1, 3, 'done', ''), pr('GDEMO2', 'P', 1, 4, 'done', ''),
      pr('GDEMO2', 'P', 2, 1, 'done', ''), pr('GDEMO2', 'P', 2, 2, 'done', ''), pr('GDEMO2', 'P', 2, 3, 'done', ''), pr('GDEMO2', 'P', 2, 4, 'done', ''), pr('GDEMO2', 'P', 2, 5, 'done', ''),
      pr('GDEMO2', 'P', 2, 6, 'submitted', 'ชื่อโครงงาน: ระบบแจ้งเตือนการใช้ไฟฟ้าเกินในห้องพัก\nปัญหา: ผู้พักไม่รู้ปริมาณไฟที่ใช้จนบิลมาถึง (สำรวจ 24 ห้อง พบ 17 ห้องต้องการรู้ยอดรายวัน)\nชิ้นงาน: กล่องวัดพลังงานพร้อมแจ้งเตือนผ่านโทรศัพท์\nทดสอบ: เทียบค่ากับมิเตอร์มาตรฐาน 10 ครั้ง\nงบประมาณ: ประมาณ 1,200 บาท / 8 สัปดาห์', 'pending', '')
    ];
    return {
      tables: {
        students: [
          { student_id: '66201010001', name: 'นายธนากร มีสุข', phone: '0812345601', level: 'ปวช.3', department: 'ช่างไฟฟ้ากำลัง', group_id: 'GDEMO1', created_at: T },
          { student_id: '66201010002', name: 'นางสาวพิมพ์ชนก แก้วใส', phone: '0812345602', level: 'ปวช.3', department: 'ช่างไฟฟ้ากำลัง', group_id: 'GDEMO1', created_at: T },
          { student_id: '66201010003', name: 'นายอนุชา ทองดี', phone: '0812345603', level: 'ปวช.3', department: 'ช่างไฟฟ้ากำลัง', group_id: 'GDEMO1', created_at: T },
          { student_id: '66201010004', name: 'นางสาวกมลวรรณ ศรีสุข', phone: '0812345604', level: 'ปวช.3', department: 'ช่างไฟฟ้ากำลัง', group_id: '', created_at: T },
          { student_id: '66201010005', name: 'นายกิตติพงษ์ สายลม', phone: '0812345605', level: 'ปวช.3', department: 'ช่างไฟฟ้ากำลัง', group_id: 'GDEMO2', created_at: T },
          { student_id: '66201010006', name: 'นางสาวอรอุมา ใจงาม', phone: '0812345606', level: 'ปวช.3', department: 'ช่างไฟฟ้ากำลัง', group_id: 'GDEMO2', created_at: T }
        ],
        teachers: [
          { teacher_id: 'T001', name: 'ครูสมศรี ใจดี', phone: '0899990001', department: 'แผนกวิชาช่างไฟฟ้ากำลัง', created_at: T },
          { teacher_id: 'T002', name: 'ครูวิชัย ช่างคิด', phone: '0899990002', department: 'แผนกวิชาเทคโนโลยีสารสนเทศ', created_at: T }
        ],
        groups: [
          { group_id: 'GDEMO1', project_name: 'เครื่องรดน้ำผักอัตโนมัติด้วยเซนเซอร์ความชื้นในดิน', project_type: 'สิ่งประดิษฐ์/นวัตกรรม', format: 'รูปแบบที่ 3 จัดเฉพาะบางหน่วยการเรียนรู้', subject_code: '20104-2104', subject_name: 'เครื่องมือวัดไฟฟ้าและอิเล็กทรอนิกส์', units: units, teacher_id: 'T001', lesson_done: '1', created_by: '66201010001', created_at: T, updated_at: T },
          { group_id: 'GDEMO2', project_name: 'ระบบแจ้งเตือนการใช้ไฟฟ้าเกินในห้องพัก', project_type: 'สิ่งประดิษฐ์/นวัตกรรม', format: 'รูปแบบที่ 3 จัดเฉพาะบางหน่วยการเรียนรู้', subject_code: '20104-2004', subject_name: 'การติดตั้งไฟฟ้าในอาคาร', units: units2, teacher_id: 'T001', lesson_done: '1', created_by: '66201010005', created_at: T, updated_at: T }
        ],
        progress: progress, settings: [], logs: []
      },
      sessions: {}
    };
  }
  if (!data || !data.tables) data = seed();

  function makeDB(SCHEMA) {
    function tb(t) { return data.tables[t] || (data.tables[t] = []); }
    function copy(o) { return Object.assign({}, o); }
    return {
      all: function (t) { return tb(t).map(copy); },
      insert: function (t, o) { var f = {}; SCHEMA[t].cols.forEach(function (c) { f[c[0]] = o[c[0]] !== undefined ? String(o[c[0]]) : ''; }); tb(t).push(f); save(); return copy(f); },
      update: function (t, pred, patch) { var n = 0; tb(t).forEach(function (o) { if (pred(copy(o))) { for (var k in patch) o[k] = String(patch[k]); n++; } }); save(); return n; },
      remove: function (t, pred) { var b = tb(t).length; data.tables[t] = tb(t).filter(function (o) { return !pred(copy(o)); }); save(); return b - data.tables[t].length; },
      ensure: function () {}
    };
  }
  var core = Core.create({
    makeDB: makeDB,
    session: {
      put: function (t, o) { data.sessions[t] = o; save(); },
      get: function (t) { return data.sessions[t] || null; },
      del: function (t) { delete data.sessions[t]; save(); }
    },
    hash: hash, now: now, uid: uid
  });
  core.ensureAll();
  return {
    api: function (a, p, t) {
      try { return { ok: true, data: JSON.parse(JSON.stringify(core.handle(a, p, t))) }; }
      catch (e) { return { ok: false, error: e.message }; }
    },
    reset: function () { try { localStorage.removeItem(KEY); sessionStorage.clear(); } catch (e) {} }
  };
})();
