I will proceed with updating your portfolio with the provided assets and content.

### **1. Asset Setup**
- **Move Files**:
  - Move `Profile Picture.jpg` → `public/profile.jpg`
  - Move `Saikrishna Resume Agiletal.docx` → `public/resume.docx`
- **Why**: Placing files in the `public` directory ensures they are accessible via a direct URL (e.g., for the download link).

### **2. Feature Updates**
- **Hero Section**:
  - Update the **Profile Picture** to use the new `profile.jpg`.
  - Fix the **Download Resume** button by wrapping it in a proper download link pointing to the new resume file.

### **3. Content Synchronization (Resume Parsing)**
- **Extract Data**: I will create a temporary script using `mammoth` (a .docx parser) to read the text content from your resume.
- **Update Portfolio Data**:
  - **Experience**: Update `src/data/experience.json` with role details, dates, and achievements from your resume (Apple, Fiserv, etc.).
  - **Skills**: Update `src/data/skills.json` to reflect the technical skills listed in your resume.
  - **Bio**: Refine the bio in `src/data/personal.json` to match your resume's professional summary.
  - **Contact**: Ensure email/LinkedIn/Location matches the resume.

### **4. Verification**
- Verify the "Download Resume" button triggers a download.
- Check that the profile picture renders correctly.
- Ensure the Experience and Skills sections accurately reflect your resume.
