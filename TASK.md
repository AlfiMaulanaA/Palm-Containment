coba cek dan hapus github yg terkait project dari project sebelum ini, dan coba push ke repo baru 
echo "# Palm-Containment" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/AlfiMaulanaA/Palm-Containment.git
git push -u origin main